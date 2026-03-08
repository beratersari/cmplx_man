from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import UserModel
from app.core.entities import MarketplaceItemStatus
from app.api.deps import get_current_user
from app.services import MarketplaceItemService
from .schemas import MarketplaceItemCreate, MarketplaceItemUpdate, MarketplaceItemOut, MarketplaceItemImageOut

router = APIRouter()


def _convert_item_to_dict(item):
    """Convert item model to dict with price conversion and images."""
    if item and hasattr(item, 'price'):
        # Get images from the relationship
        images = []
        if hasattr(item, 'images') and item.images:
            images = [{'id': img.id, 'img_path': img.img_path} for img in item.images]
        
        item_dict = {
            'id': item.id,
            'category_id': item.category_id,
            'user_id': item.user_id,
            'username': item.username,
            'contact': item.contact,
            'title': item.title,
            'description': item.description,
            'price': item.price / 100.0,  # Convert cents to dollars
            'complex_id': item.complex_id,
            'status': item.status,
            'listed_date': item.listed_date,
            'images': images,
            'created_date': item.created_date,
            'created_by': item.created_by,
            'updated_date': item.updated_date,
            'updated_by': item.updated_by,
            'is_active': item.is_active,
        }
        return item_dict
    return item


@router.post("/", response_model=MarketplaceItemOut, summary="Create Marketplace Item", description="Creates a new marketplace item. User info (username, contact) is automatically filled from auth info. Complex is determined from user's assignment. Items expire after 30 days.")
def create_item(
    item_in: MarketplaceItemCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Create a new marketplace item.
    User info (username, contact) is automatically filled from auth info.
    Complex is determined from user's assignment.
    Items expire after 30 days - you can relist them by updating with relist=true.
    """
    service = MarketplaceItemService(db)
    item = service.create_item(item_in, current_user)
    return _convert_item_to_dict(item)


@router.get("/", response_model=List[MarketplaceItemOut], summary="List Marketplace Items", description="Retrieves a list of marketplace items. Admins see all items. Other users see items in their complex. Can be filtered by complex_id, category_id, and status. Items are auto-expired after 30 days.")
def read_items(
    complex_id: int = None,
    category_id: int = None,
    status: Optional[MarketplaceItemStatus] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List marketplace items. Items are automatically expired after 30 days."""
    service = MarketplaceItemService(db)
    items = service.list_items(current_user, complex_id, category_id, status, skip, limit)
    return [_convert_item_to_dict(item) for item in items]


@router.get("/my", response_model=List[MarketplaceItemOut], summary="List My Marketplace Items", description="Retrieves a list of marketplace items created by the current user. Includes expired items.")
def read_my_items(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List marketplace items created by the current user, including expired ones."""
    service = MarketplaceItemService(db)
    items = service.list_my_items(current_user, skip, limit)
    return [_convert_item_to_dict(item) for item in items]


@router.get("/{item_id}", response_model=MarketplaceItemOut, summary="Get Marketplace Item", description="Retrieves a specific marketplace item by ID.")
def read_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get a specific marketplace item."""
    service = MarketplaceItemService(db)
    item = service.get_item_by_id(item_id)
    return _convert_item_to_dict(item)


@router.put("/{item_id}", response_model=MarketplaceItemOut, summary="Update Marketplace Item", description="Updates a marketplace item. Only the owner or admin can update an item. Set relist=true to relist an expired item (resets the 30-day timer).")
def update_item(
    item_id: int,
    item_in: MarketplaceItemUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Update a marketplace item.
    Only the owner or admin can update an item.
    Set relist=true to relist an expired item (resets the 30-day timer).
    """
    service = MarketplaceItemService(db)
    item = service.update_item(item_id, item_in, current_user)
    return _convert_item_to_dict(item)


@router.delete("/{item_id}", summary="Delete Marketplace Item", description="Deletes a marketplace item. Only the owner or admin can delete an item.")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Delete a marketplace item."""
    service = MarketplaceItemService(db)
    return service.delete_item(item_id, current_user)