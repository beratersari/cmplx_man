from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import UserModel
from app.api.deps import get_current_user
from app.services import VehicleService
from .schemas import VehicleCreate, VehicleOut, VehicleUpdate

router = APIRouter()


@router.post("/", response_model=VehicleOut, summary="Register Vehicle", description="Registers a new vehicle for a user. Restricted to Admins, the vehicle owner, or Site Managers assigned to the owner's complex.")
def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Register a new vehicle."""
    service = VehicleService(db)
    return service.create_vehicle(vehicle_in, current_user)


@router.get("/", response_model=List[VehicleOut], summary="List Vehicles", description="Retrieves a list of vehicles. Admins see all vehicles. Site Managers see vehicles belonging to residents in their assigned complexes. Residents see only their own vehicles.")
def read_vehicles(
    user_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List vehicles."""
    service = VehicleService(db)
    return service.list_vehicles(current_user, user_id, skip, limit)


@router.put("/{vehicle_id}", response_model=VehicleOut, summary="Update Vehicle", description="Updates a vehicle's details. Restricted to Admins, the vehicle owner, or Site Managers assigned to the owner's complex.")
def update_vehicle(
    vehicle_id: int,
    vehicle_in: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Update a vehicle."""
    service = VehicleService(db)
    return service.update_vehicle(vehicle_id, vehicle_in, current_user)


@router.delete("/{vehicle_id}", summary="Delete Vehicle", description="Deletes a vehicle. Restricted to Admins, the vehicle owner, or Site Managers assigned to the owner's complex.")
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Delete a vehicle."""
    service = VehicleService(db)
    return service.delete_vehicle(vehicle_id, current_user)
