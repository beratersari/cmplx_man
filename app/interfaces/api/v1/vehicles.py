from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.infrastructure.models import VehicleModel, UserModel, BuildingModel
from app.domain.entities import UserRole
from app.interfaces.api.deps import get_current_user
from app.infrastructure.logging_config import logger
from .schemas import VehicleCreate, VehicleOut, VehicleUpdate

router = APIRouter()

# Access: Admins, vehicle owner, or managers assigned to owner's complex.
@router.post("/", response_model=VehicleOut, summary="Register Vehicle", description="Registers a new vehicle for a user. Restricted to Admins, the vehicle owner, or Site Managers assigned to the owner's complex.")
def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) registering vehicle for user ID {vehicle_in.user_id}")
    user = db.query(UserModel).filter(UserModel.id == vehicle_in.user_id).first()
    if not user:
        logger.error(f"Vehicle registration failed: User ID {vehicle_in.user_id} not found")
        raise HTTPException(status_code=404, detail="User not found")

    # Authorization: admin or owner or manager of owner's complex
    if current_user.role != UserRole.ADMIN and current_user.id != user.id:
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized vehicle registration attempt by {current_user.username}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        complex_ids = [c.id for c in current_user.assigned_complexes]
        resident_complex_ids = [b.complex_id for b in user.assigned_buildings]
        if not set(resident_complex_ids).intersection(set(complex_ids)):
            logger.warning(f"Unauthorized vehicle registration attempt by manager {current_user.username} for unrelated resident ID {user.id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")

    # Check plate uniqueness
    existing = db.query(VehicleModel).filter(VehicleModel.plate_number == vehicle_in.plate_number).first()
    if existing:
        logger.warning(f"Vehicle registration failed: Plate {vehicle_in.plate_number} already exists")
        raise HTTPException(status_code=400, detail="Vehicle plate already exists")

    vehicle = VehicleModel(
        user_id=vehicle_in.user_id,
        plate_number=vehicle_in.plate_number,
        created_by=current_user.id
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    logger.info(f"Vehicle registered successfully: {vehicle.plate_number} (ID: {vehicle.id})")
    return vehicle

# Access: Admins see all vehicles; managers see vehicles in assigned complexes; residents see their own.
@router.get("/", response_model=List[VehicleOut], summary="List Vehicles", description="Retrieves a list of vehicles. Admins see all vehicles. Site Managers see vehicles belonging to residents in their assigned complexes. Residents see only their own vehicles.")
def read_vehicles(
    user_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching vehicles")
    query = db.query(VehicleModel)
    if user_id:
        query = query.filter(VehicleModel.user_id == user_id)

    vehicles = query.offset(skip).limit(limit).all()

    if current_user.role == UserRole.ADMIN:
        return vehicles

    if current_user.role == UserRole.SITE_MANAGER:
        complex_ids = [c.id for c in current_user.assigned_complexes]
        return [v for v in vehicles if any(b.complex_id in complex_ids for b in v.user.assigned_buildings)]

    # Residents can only see their own vehicles
    return [v for v in vehicles if v.user_id == current_user.id]

# Access: Admins, vehicle owner, or managers assigned to owner's complex.
@router.put("/{vehicle_id}", response_model=VehicleOut, summary="Update Vehicle", description="Updates a vehicle's details. Restricted to Admins, the vehicle owner, or Site Managers assigned to the owner's complex.")
def update_vehicle(
    vehicle_id: int,
    vehicle_in: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) updating vehicle ID {vehicle_id}")
    vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
    if not vehicle:
        logger.error(f"Update failed: Vehicle ID {vehicle_id} not found")
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Authorization: admin, owner, or manager of owner's complex
    if current_user.role != UserRole.ADMIN and current_user.id != vehicle.user_id:
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized update attempt on vehicle ID {vehicle_id} by {current_user.username}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        complex_ids = [c.id for c in current_user.assigned_complexes]
        resident_complex_ids = [b.complex_id for b in vehicle.user.assigned_buildings]
        if not set(resident_complex_ids).intersection(set(complex_ids)):
            logger.warning(f"Unauthorized update attempt by manager {current_user.username} for unrelated vehicle ID {vehicle_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")

    if vehicle_in.plate_number:
        existing = db.query(VehicleModel).filter(
            VehicleModel.plate_number == vehicle_in.plate_number,
            VehicleModel.id != vehicle_id
        ).first()
        if existing:
            logger.warning(f"Update failed: Plate {vehicle_in.plate_number} already exists")
            raise HTTPException(status_code=400, detail="Vehicle plate already exists")
        vehicle.plate_number = vehicle_in.plate_number

    vehicle.updated_by = current_user.id
    db.commit()
    db.refresh(vehicle)
    logger.info(f"Vehicle ID {vehicle_id} updated successfully by {current_user.username}")
    return vehicle

# Access: Admins, vehicle owner, or managers assigned to owner's complex.
@router.delete("/{vehicle_id}", summary="Delete Vehicle", description="Deletes a vehicle. Restricted to Admins, the vehicle owner, or Site Managers assigned to the owner's complex.")
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) deleting vehicle ID {vehicle_id}")
    vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
    if not vehicle:
        logger.error(f"Deletion failed: Vehicle ID {vehicle_id} not found")
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Authorization: admin, owner, or manager of owner's complex
    if current_user.role != UserRole.ADMIN and current_user.id != vehicle.user_id:
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized deletion attempt on vehicle ID {vehicle_id} by {current_user.username}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        complex_ids = [c.id for c in current_user.assigned_complexes]
        resident_complex_ids = [b.complex_id for b in vehicle.user.assigned_buildings]
        if not set(resident_complex_ids).intersection(set(complex_ids)):
            logger.warning(f"Unauthorized deletion attempt by manager {current_user.username} for unrelated vehicle ID {vehicle_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")

    db.delete(vehicle)
    db.commit()
    logger.info(f"Vehicle ID {vehicle_id} deleted successfully by {current_user.username}")
    return {"message": "Vehicle deleted successfully"}
