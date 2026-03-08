from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import UserModel
from app.core.entities import UserRole
from app.api.deps import get_current_user, RoleChecker
from app.services import MarketplaceCategoryService
from .schemas import (
    MarketplaceCategoryCreate, 
    AdminMarketplaceCategoryCreate, 
    MarketplaceCategoryOut, 
    MarketplaceCategoryUpdate
)

router = APIRouter()


@router.post("/", response_model=MarketplaceCategoryOut, summary="Create Marketplace Category", description="Creates a new marketplace category in the manager's complex. Complex ID is automatically extracted from the authenticated manager's context. Restricted to Admins, Site Managers, and Site Attendants.")
def create_category(
    category_in: MarketplaceCategoryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Create a new marketplace category in the manager's complex.
    The complex ID is automatically determined from the authenticated user's context.
    """
    service = MarketplaceCategoryService(db)
    return service.create_category_in_my_complex(category_in, current_user)


@router.post("/admin", response_model=MarketplaceCategoryOut, summary="Admin: Create Marketplace Category", description="Creates a new marketplace category in a specific complex. Restricted to Admins only. Allows creating categories in any complex in the system.")
def admin_create_category(
    category_in: AdminMarketplaceCategoryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """
    Admin endpoint to create a marketplace category in any specific complex.
    """
    service = MarketplaceCategoryService(db)
    return service.admin_create_category(category_in, current_user)


@router.get("/", response_model=List[MarketplaceCategoryOut], summary="List Marketplace Categories", description="Retrieves a list of marketplace categories. Admins see all categories. Other users see categories in their complex. Can be filtered by complex_id.")
def read_categories(
    complex_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List marketplace categories."""
    service = MarketplaceCategoryService(db)
    return service.list_categories(current_user, complex_id, skip, limit)


@router.put("/{category_id}", response_model=MarketplaceCategoryOut, summary="Update Marketplace Category", description="Updates a marketplace category in the manager's complex. Restricted to Admins, Site Managers, and Site Attendants. Validates that the category belongs to the manager's complex.")
def update_my_category(
    category_id: int,
    category_in: MarketplaceCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Update a marketplace category in the manager's complex.
    Validates that the category belongs to the manager's complex.
    """
    service = MarketplaceCategoryService(db)
    return service.update_my_category(category_id, category_in, current_user)


@router.put("/admin/{category_id}", response_model=MarketplaceCategoryOut, summary="Admin: Update Marketplace Category", description="Updates any marketplace category's details including the complex assignment. Restricted to Admins only.")
def admin_update_category(
    category_id: int,
    category_in: AdminMarketplaceCategoryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """
    Admin endpoint to update any marketplace category.
    """
    service = MarketplaceCategoryService(db)
    return service.admin_update_category(category_id, category_in, current_user)


@router.delete("/{category_id}", summary="Delete Marketplace Category", description="Deletes a marketplace category. Restricted to Admins, Site Managers, or Site Attendants assigned to the category's complex.")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Delete a marketplace category."""
    service = MarketplaceCategoryService(db)
    return service.delete_category(category_id, current_user)