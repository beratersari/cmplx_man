from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.infrastructure.models import VehicleModel, UserModel, BuildingModel
from app.domain.entities import UserRole
from app.interfaces.api.deps import get_current_user
from .schemas import VehicleCreate, VehicleOut, VehicleUpdate

router = APIRouter()

@router.post("/", response_model=VehicleOut)
def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    user = db.query(UserModel).filter(UserModel.id == vehicle_in.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Authorization: admin or owner or manager of owner's complex
    if current_user.role != UserRole.ADMIN and current_user.id != user.id:
        if current_user.role != UserRole.SITE_MANAGER:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        complex_ids = [c.id for c in current_user.assigned_complexes]
        resident_complex_ids = [b.complex_id for b in user.assigned_buildings]
        if not set(resident_complex_ids).intersection(set(complex_ids)):
            raise HTTPException(status_code=403, detail="Not enough permissions")

    # Check plate uniqueness
    existing = db.query(VehicleModel).filter(VehicleModel.plate_number == vehicle_in.plate_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle plate already exists")

    vehicle = VehicleModel(
        user_id=vehicle_in.user_id,
        plate_number=vehicle_in.plate_number,
        make=vehicle_in.make,
        model=vehicle_in.model,
        color=vehicle_in.color,
        created_by=current_user.id
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle

@router.get("/", response_model=List[VehicleOut])
def read_vehicles(
    user_id: int = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = db.query(VehicleModel)
    if user_id:
        query = query.filter(VehicleModel.user_id == user_id)

    vehicles = query.all()

    if current_user.role == UserRole.ADMIN:
        return vehicles

    if current_user.role == UserRole.SITE_MANAGER:
        complex_ids = [c.id for c in current_user.assigned_complexes]
        return [v for v in vehicles if any(b.complex_id in complex_ids for b in v.user.assigned_buildings)]

    # Residents can only see their own vehicles
    return [v for v in vehicles if v.user_id == current_user.id]

@router.put("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: int,
    vehicle_in: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Authorization: admin, owner, or manager of owner's complex
    if current_user.role != UserRole.ADMIN and current_user.id != vehicle.user_id:
        if current_user.role != UserRole.SITE_MANAGER:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        complex_ids = [c.id for c in current_user.assigned_complexes]
        resident_complex_ids = [b.complex_id for b in vehicle.user.assigned_buildings]
        if not set(resident_complex_ids).intersection(set(complex_ids)):
            raise HTTPException(status_code=403, detail="Not enough permissions")

    if vehicle_in.plate_number:
        existing = db.query(VehicleModel).filter(
            VehicleModel.plate_number == vehicle_in.plate_number,
            VehicleModel.id != vehicle_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Vehicle plate already exists")
        vehicle.plate_number = vehicle_in.plate_number

    if vehicle_in.make is not None:
        vehicle.make = vehicle_in.make
    if vehicle_in.model is not None:
        vehicle.model = vehicle_in.model
    if vehicle_in.color is not None:
        vehicle.color = vehicle_in.color

    vehicle.updated_by = current_user.id
    db.commit()
    db.refresh(vehicle)
    return vehicle

@router.delete("/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    vehicle = db.query(VehicleModel).filter(VehicleModel.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Authorization: admin, owner, or manager of owner's complex
    if current_user.role != UserRole.ADMIN and current_user.id != vehicle.user_id:
        if current_user.role != UserRole.SITE_MANAGER:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        complex_ids = [c.id for c in current_user.assigned_complexes]
        resident_complex_ids = [b.complex_id for b in vehicle.user.assigned_buildings]
        if not set(resident_complex_ids).intersection(set(complex_ids)):
            raise HTTPException(status_code=403, detail="Not enough permissions")

    db.delete(vehicle)
    db.commit()
    return {"message": "Vehicle deleted successfully"}
