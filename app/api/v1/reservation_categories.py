from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import UserModel
from app.core.entities import UserRole
from app.api.deps import get_current_user, RoleChecker
from app.services import ReservationCategoryService
from .schemas import (
    ReservationCategoryCreate, 
    AdminReservationCategoryCreate, 
    ReservationCategoryOut, 
    ReservationCategoryUpdate
)

router = APIRouter()


@router.post("/", response_model=ReservationCategoryOut, summary="Create Reservation Category", description="Creates a new reservation category in the manager's complex. Complex ID is automatically extracted from the authenticated manager's context. Restricted to Site Managers only.")
def create_category(
    category_in: ReservationCategoryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Create a new reservation category in the manager's complex.
    The complex ID is automatically determined from the authenticated manager's context.
    """
    service = ReservationCategoryService(db)
    return service.create_category_in_my_complex(category_in, current_user)


@router.post("/admin", response_model=ReservationCategoryOut, summary="Admin: Create Reservation Category", description="Creates a new reservation category in a specific complex. Restricted to Admins only. Allows creating categories in any complex in the system.")
def admin_create_category(
    category_in: AdminReservationCategoryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """
    Admin endpoint to create a reservation category in any specific complex.
    """
    service = ReservationCategoryService(db)
    return service.admin_create_category(category_in, current_user)


@router.get("/", response_model=List[ReservationCategoryOut], summary="List Reservation Categories", description="Retrieves a list of reservation categories. Admins see all categories. Managers see categories in their complex. Users see categories in their assigned complex. Can be filtered by complex_id.")
def read_categories(
    complex_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List reservation categories."""
    service = ReservationCategoryService(db)
    return service.list_categories(current_user, complex_id, skip, limit)


@router.put("/{category_id}", response_model=ReservationCategoryOut, summary="Update Reservation Category", description="Updates a reservation category in the manager's complex. Restricted to Site Managers only. Validates that the category belongs to the manager's complex.")
def update_my_category(
    category_id: int,
    category_in: ReservationCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Update a reservation category in the manager's complex.
    Validates that the category belongs to the manager's complex.
    """
    service = ReservationCategoryService(db)
    return service.update_my_category(category_id, category_in, current_user)


@router.put("/admin/{category_id}", response_model=ReservationCategoryOut, summary="Admin: Update Reservation Category", description="Updates any reservation category's details including the complex assignment. Restricted to Admins only.")
def admin_update_category(
    category_id: int,
    category_in: AdminReservationCategoryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """
    Admin endpoint to update any reservation category.
    """
    service = ReservationCategoryService(db)
    return service.admin_update_category(category_id, category_in, current_user)


@router.delete("/{category_id}", summary="Delete Reservation Category", description="Deletes a reservation category. Restricted to Admins or Site Managers assigned to the category's complex.")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Delete a reservation category."""
    service = ReservationCategoryService(db)
    return service.delete_category(category_id, current_user)
