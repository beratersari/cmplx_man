from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.models import MarketplaceItemModel, MarketplaceItemImageModel
from app.core.entities import MarketplaceItemStatus
from .base_repository import BaseRepository


class MarketplaceItemRepository(BaseRepository[MarketplaceItemModel]):
    """Repository for Marketplace Item entity operations."""
    
    def __init__(self, db: Session):
        super().__init__(db, MarketplaceItemModel)
    
    def get_items_by_complex(
        self, 
        complex_id: int, 
        skip: int = 0, 
        limit: int = 50,
        status: Optional[MarketplaceItemStatus] = None,
        category_id: Optional[int] = None
    ) -> List[MarketplaceItemModel]:
        """Get all items in a complex with optional filters."""
        query = self.db.query(MarketplaceItemModel).filter(
            MarketplaceItemModel.complex_id == complex_id
        )
        if status:
            query = query.filter(MarketplaceItemModel.status == status)
        if category_id:
            query = query.filter(MarketplaceItemModel.category_id == category_id)
        return query.offset(skip).limit(limit).all()
    
    def get_items_by_user(
        self, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[MarketplaceItemModel]:
        """Get all items by a user."""
        return self.db.query(MarketplaceItemModel).filter(
            MarketplaceItemModel.user_id == user_id
        ).offset(skip).limit(limit).all()
    
    def get_items_by_category(
        self, 
        category_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[MarketplaceItemModel]:
        """Get all items in a category."""
        return self.db.query(MarketplaceItemModel).filter(
            MarketplaceItemModel.category_id == category_id
        ).offset(skip).limit(limit).all()
    
    def expire_old_items(self) -> int:
        """Expire items that have been listed for more than 30 days. Returns count of expired items."""
        expiration_date = datetime.utcnow() - timedelta(days=30)
        expired_items = self.db.query(MarketplaceItemModel).filter(
            MarketplaceItemModel.status == MarketplaceItemStatus.AVAILABLE,
            MarketplaceItemModel.listed_date < expiration_date
        ).all()
        
        count = 0
        for item in expired_items:
            item.status = MarketplaceItemStatus.EXPIRED
            count += 1
        
        if count > 0:
            self.db.commit()
        
        return count
    
    def add_images(self, item: MarketplaceItemModel, img_paths: List[str]) -> None:
        """Add images to an item."""
        for img_path in img_paths:
            image = MarketplaceItemImageModel(item_id=item.id, img_path=img_path)
            self.db.add(image)
        self.db.commit()
        self.db.refresh(item)
    
    def clear_images(self, item: MarketplaceItemModel) -> None:
        """Clear all images from an item."""
        self.db.query(MarketplaceItemImageModel).filter(
            MarketplaceItemImageModel.item_id == item.id
        ).delete()
        self.db.commit()