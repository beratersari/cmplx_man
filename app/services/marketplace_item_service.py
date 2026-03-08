from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import MarketplaceItemRepository, MarketplaceCategoryRepository, ComplexRepository
from app.models.models import UserModel, MarketplaceItemModel
from app.core.entities import UserRole, MarketplaceItemStatus
from app.api.v1.schemas import MarketplaceItemCreate, MarketplaceItemUpdate
from app.core.logging_config import logger


class MarketplaceItemService:
    """Service for marketplace item-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.item_repo = MarketplaceItemRepository(db)
        self.category_repo = MarketplaceCategoryRepository(db)
        self.complex_repo = ComplexRepository(db)
    
    def _get_user_complex_id(self, current_user: UserModel) -> Optional[int]:
        """Get the complex ID for a user."""
        if current_user.assigned_complexes:
            return current_user.assigned_complexes[0].id
        if current_user.assigned_buildings:
            return current_user.assigned_buildings[0].complex_id
        return None
    
    def _check_and_expire_items(self):
        """Check and expire old items before operations."""
        expired_count = self.item_repo.expire_old_items()
        if expired_count > 0:
            logger.info(f"Auto-expired {expired_count} marketplace items")
    
    def create_item(
        self, 
        item_in: MarketplaceItemCreate, 
        current_user: UserModel
    ) -> MarketplaceItemModel:
        """
        Create a new marketplace item.
        User info (username, contact) is filled from auth info.
        Complex is determined from user's assignment.
        """
        logger.info(f"User {current_user.username} (ID: {current_user.id}) creating marketplace item: {item_in.title}")
        
        # Expire old items first
        self._check_and_expire_items()
        
        # Get user's complex
        complex_id = self._get_user_complex_id(current_user)
        if not complex_id:
            logger.warning(f"User {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        # Validate category exists and belongs to user's complex
        category = self.category_repo.get_by_id(item_in.category_id)
        if not category:
            logger.error(f"Item creation failed: Category ID {item_in.category_id} not found")
            raise HTTPException(status_code=404, detail="Category not found")
        
        if category.complex_id != complex_id:
            logger.warning(f"Item creation failed: Category ID {item_in.category_id} is not in user's complex")
            raise HTTPException(status_code=400, detail="Category does not belong to your complex")
        
        # Get user's contact info (fallback to username if not set)
        contact = current_user.contact or current_user.username
        
        # Store price as cents to avoid floating point issues
        price_cents = int(item_in.price * 100)
        
        item_data = {
            "category_id": item_in.category_id,
            "user_id": current_user.id,
            "username": current_user.username,
            "contact": contact,
            "title": item_in.title,
            "description": item_in.description,
            "price": price_cents,
            "complex_id": complex_id,
            "status": MarketplaceItemStatus.AVAILABLE,
            "listed_date": datetime.utcnow(),
        }
        
        new_item = self.item_repo.create(item_data, created_by=current_user.id)
        
        # Add images if provided
        if item_in.img_paths:
            self.item_repo.add_images(new_item, item_in.img_paths)
        
        logger.info(f"Marketplace item created successfully: {new_item.title} (ID: {new_item.id})")
        return new_item
    
    def get_item_by_id(self, item_id: int) -> MarketplaceItemModel:
        """Get item by ID or raise exception."""
        item = self.item_repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item
    
    def list_items(
        self, 
        current_user: UserModel, 
        complex_id: int = None,
        category_id: int = None,
        status: Optional[MarketplaceItemStatus] = None,
        skip: int = 0, 
        limit: int = 50
    ) -> List[MarketplaceItemModel]:
        """List items based on current user's role and filters."""
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching marketplace items")
        
        # Expire old items first
        self._check_and_expire_items()
        
        if current_user.role == UserRole.ADMIN:
            if complex_id:
                return self.item_repo.get_items_by_complex(complex_id, skip, limit, status, category_id)
            return self.item_repo.get_all(skip, limit)
        
        # For other users, only show items in their complex
        user_complex_id = self._get_user_complex_id(current_user)
        if not user_complex_id:
            return []
        
        return self.item_repo.get_items_by_complex(user_complex_id, skip, limit, status, category_id)
    
    def list_my_items(
        self, 
        current_user: UserModel, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[MarketplaceItemModel]:
        """List items created by the current user."""
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching their marketplace items")
        
        # Expire old items first
        self._check_and_expire_items()
        
        return self.item_repo.get_items_by_user(current_user.id, skip, limit)
    
    def update_item(
        self, 
        item_id: int, 
        item_in: MarketplaceItemUpdate, 
        current_user: UserModel
    ) -> MarketplaceItemModel:
        """
        Update a marketplace item.
        Only the owner can update their items.
        Supports relisting expired items.
        """
        logger.info(f"User {current_user.username} (ID: {current_user.id}) updating marketplace item ID {item_id}")
        
        # Expire old items first
        self._check_and_expire_items()
        
        item = self.item_repo.get_by_id(item_id)
        if not item:
            logger.error(f"Update failed: Item ID {item_id} not found")
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Only owner or admin can update
        if item.user_id != current_user.id and current_user.role != UserRole.ADMIN:
            logger.warning(f"Unauthorized update attempt by {current_user.username} for item ID {item_id}")
            raise HTTPException(status_code=403, detail="You can only update your own items")
        
        update_data = {}
        
        # Handle relisting
        if item_in.relist and item.status == MarketplaceItemStatus.EXPIRED:
            update_data["status"] = MarketplaceItemStatus.AVAILABLE
            update_data["listed_date"] = datetime.utcnow()
            logger.info(f"Relisting expired item ID {item_id}")
        
        if item_in.category_id:
            # Validate category exists and belongs to item's complex
            category = self.category_repo.get_by_id(item_in.category_id)
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
            if category.complex_id != item.complex_id:
                raise HTTPException(status_code=400, detail="Category does not belong to this complex")
            update_data["category_id"] = item_in.category_id
        
        if item_in.title:
            update_data["title"] = item_in.title
        
        if item_in.description:
            update_data["description"] = item_in.description
        
        if item_in.price is not None:
            update_data["price"] = int(item_in.price * 100)
        
        if item_in.status and not item_in.relist:
            update_data["status"] = item_in.status
        
        item = self.item_repo.update(item, update_data, updated_by=current_user.id)
        
        # Handle image updates
        if item_in.img_paths is not None:
            self.item_repo.clear_images(item)
            if item_in.img_paths:
                self.item_repo.add_images(item, item_in.img_paths)
        
        logger.info(f"Marketplace item ID {item_id} updated successfully by {current_user.username}")
        return item
    
    def delete_item(self, item_id: int, current_user: UserModel) -> dict:
        """Delete an item with authorization checks. Managers can delete spam items."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) deleting marketplace item ID {item_id}")
        
        item = self.item_repo.get_by_id(item_id)
        if not item:
            logger.error(f"Deletion failed: Item ID {item_id} not found")
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Owner can delete their own items
        if item.user_id == current_user.id:
            pass
        # Admin can delete any item
        elif current_user.role == UserRole.ADMIN:
            pass
        # Managers/Attendants can delete items in their complex (for spam moderation)
        elif current_user.role in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            user_complex_ids = [c.id for c in current_user.assigned_complexes]
            if item.complex_id not in user_complex_ids:
                logger.warning(f"Unauthorized deletion attempt by {current_user.username} for item ID {item_id}")
                raise HTTPException(status_code=403, detail="Not enough permissions")
        else:
            logger.warning(f"Unauthorized deletion attempt by {current_user.username} for item ID {item_id}")
            raise HTTPException(status_code=403, detail="You can only delete your own items")
        
        self.item_repo.delete(item)
        logger.info(f"Marketplace item ID {item_id} deleted successfully by {current_user.username}")
        return {"message": "Item deleted successfully"}