from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import UserModel
from app.core.entities import UserRole
from app.api.deps import get_current_user, RoleChecker
from app.services import ComplexService
from .schemas import (
    ResidentialComplexCreate, 
    ResidentialComplexOut, 
    ComplexAssignment, 
    AdminComplexAssignment,
    UserOut
)

router = APIRouter()


@router.post("/", response_model=ResidentialComplexOut, summary="Create Residential Complex", description="Creates a new residential complex. Restricted to Admins only.")
def create_complex(
    complex_in: ResidentialComplexCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """Create a new residential complex (admin only)."""
    service = ComplexService(db)
    return service.create_complex(complex_in, current_user)


@router.get("/", response_model=List[ResidentialComplexOut], summary="List Residential Complexes", description="Retrieves a list of residential complexes. Admins can see all complexes. Managers and attendants can only see the complexes they are assigned to.")
def read_complexes(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List residential complexes."""
    service = ComplexService(db)
    return service.list_complexes(current_user, skip, limit)


@router.post("/assign", summary="Assign User to My Complex", description="Assigns a user to the authenticated manager's complex. Complex ID is automatically extracted from the manager's context. Restricted to Site Managers only.")
def assign_user_to_my_complex(
    assignment: ComplexAssignment,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Assign a user to the manager's complex.
    The complex ID is automatically determined from the authenticated manager's context.
    """
    service = ComplexService(db)
    return service.assign_user_to_my_complex(assignment, current_user)


@router.post("/assign/admin", summary="Admin: Assign User to Complex", description="Assigns a user to a specific complex. Restricted to Admins only. Allows assigning users to any complex in the system.")
def admin_assign_user_to_complex(
    assignment: AdminComplexAssignment,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """
    Admin endpoint to assign a user to any specific complex.
    """
    service = ComplexService(db)
    return service.admin_assign_user_to_complex(assignment, current_user)


@router.get("/me", response_model=ResidentialComplexOut, summary="Get My Complex", description="Retrieves the residential complex assigned to the authenticated manager. Restricted to Site Managers only.")
def get_my_complex(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Get the manager's assigned complex.
    """
    service = ComplexService(db)
    return service.get_my_complex(current_user)


@router.get("/me/users", response_model=List[UserOut], summary="List My Complex Users", description="Retrieves a list of all users in the manager's assigned complex. Complex ID is automatically extracted from the manager's context. Restricted to Site Managers only.")
def get_my_complex_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Get all users in the manager's complex.
    """
    service = ComplexService(db)
    return service.get_my_complex_users(current_user, skip, limit)


@router.get("/me/users-by-role", summary="List My Complex Users Grouped by Role", description="Retrieves all users in the manager's complex grouped by role. Complex ID is automatically extracted from the manager's context. Restricted to Site Managers only.")
def get_my_complex_users_by_role(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Get users in the manager's complex grouped by role.
    """
    service = ComplexService(db)
    return service.get_my_complex_users_by_role(current_user)


@router.put("/me", response_model=ResidentialComplexOut, summary="Update My Complex", description="Updates the manager's complex details. Complex ID is automatically extracted from the manager's context. Restricted to Site Managers only.")
def update_my_complex(
    complex_in: ResidentialComplexCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Update the manager's complex.
    """
    service = ComplexService(db)
    return service.update_my_complex(complex_in, current_user)


@router.get("/{complex_id}/users", response_model=List[UserOut], summary="Admin: List Complex Users", description="Retrieves a list of all users (managers, attendants, residents) assigned to a specific residential complex. Restricted to Admins only.")
def admin_get_complex_users(
    complex_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """Admin endpoint to get all users in a specific complex."""
    service = ComplexService(db)
    return service.admin_get_complex_users(complex_id, current_user, skip, limit)


@router.get("/{complex_id}/users-by-role", summary="Admin: List Complex Users Grouped by Role", description="Retrieves all users in a specific complex grouped by role. Restricted to Admins only.")
def admin_get_complex_users_by_role(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """Admin endpoint to get users in a specific complex grouped by role."""
    service = ComplexService(db)
    return service.admin_get_complex_users_by_role(complex_id, current_user)


@router.put("/{complex_id}", response_model=ResidentialComplexOut, summary="Admin: Update Residential Complex", description="Updates any residential complex's details. Restricted to Admins only.")
def admin_update_complex(
    complex_id: int,
    complex_in: ResidentialComplexCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """Admin endpoint to update any residential complex."""
    service = ComplexService(db)
    return service.update_complex(complex_id, complex_in, current_user)


@router.delete("/{complex_id}", summary="Delete Residential Complex", description="Deletes a residential complex. Restricted to Admins only.")
def delete_complex(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """Delete a residential complex (admin only)."""
    service = ComplexService(db)
    return service.delete_complex(complex_id, current_user)
