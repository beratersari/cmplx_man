from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import UserModel
from app.core.entities import UserRole
from app.api.deps import get_current_user, RoleChecker
from app.services import BuildingService
from .schemas import BuildingCreate, AdminBuildingCreate, BuildingOut, BuildingAssignment, UserOut

router = APIRouter()


@router.post("/", response_model=BuildingOut, summary="Create Building", description="Creates a new building in the manager's complex. Complex ID is automatically extracted from the authenticated manager's context. Restricted to Site Managers only.")
def create_building(
    building_in: BuildingCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Create a new building in the manager's complex.
    The complex ID is automatically determined from the authenticated manager's context.
    """
    service = BuildingService(db)
    return service.create_building_in_my_complex(building_in, current_user)


@router.post("/admin", response_model=BuildingOut, summary="Admin: Create Building", description="Creates a new building in a specific complex. Restricted to Admins only. Allows creating buildings in any complex in the system.")
def admin_create_building(
    building_in: AdminBuildingCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """
    Admin endpoint to create a building in any specific complex.
    """
    service = BuildingService(db)
    return service.admin_create_building(building_in, current_user)


@router.post("/assign", summary="Assign Resident to Building", description="Assigns a user to a building. Restricted to Admins or Site Managers assigned to the building's complex. The user must already be assigned to the building's complex. A user can belong to at most one building.")
def assign_resident(
    assignment: BuildingAssignment,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Assign a resident to a building."""
    service = BuildingService(db)
    return service.assign_resident(assignment, current_user)


@router.get("/{building_id}/users", response_model=List[UserOut], summary="List Building Users", description="Retrieves a list of all users assigned to a specific building, plus management users of the building's complex. Restricted to Admins or users assigned to the building's complex.")
def read_building_users(
    building_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get all users in a building."""
    service = BuildingService(db)
    return service.get_building_users(building_id, current_user, skip, limit)


@router.put("/{building_id}", response_model=BuildingOut, summary="Update Building", description="Updates a building in the manager's complex. Restricted to Site Managers only. Validates that the building belongs to the manager's complex.")
def update_my_building(
    building_id: int,
    building_in: BuildingCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Update a building in the manager's complex.
    Validates that the building belongs to the manager's complex.
    """
    service = BuildingService(db)
    return service.update_my_building(building_id, building_in, current_user)


@router.put("/admin/{building_id}", response_model=BuildingOut, summary="Admin: Update Building", description="Updates any building's details including the complex assignment. Restricted to Admins only.")
def admin_update_building(
    building_id: int,
    building_in: AdminBuildingCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """
    Admin endpoint to update any building.
    """
    service = BuildingService(db)
    return service.admin_update_building(building_id, building_in, current_user)


@router.delete("/{building_id}", summary="Delete Building", description="Deletes a building. Restricted to Admins or Site Managers assigned to the building's complex.")
def delete_building(
    building_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Delete a building."""
    service = BuildingService(db)
    return service.delete_building(building_id, current_user)


@router.get("/", response_model=List[BuildingOut], summary="List Buildings", description="Retrieves a list of buildings. Admins see all buildings. Other users only see buildings within their assigned complexes. Can be filtered by complex_id.")
def read_buildings(
    complex_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List buildings."""
    service = BuildingService(db)
    return service.list_buildings(current_user, complex_id, skip, limit)
