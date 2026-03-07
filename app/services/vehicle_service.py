from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import VehicleRepository, UserRepository
from app.models.models import UserModel, VehicleModel
from app.core.entities import UserRole
from app.api.v1.schemas import VehicleCreate, VehicleUpdate
from app.core.logging_config import logger


class VehicleService:
    """Service for vehicle-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.vehicle_repo = VehicleRepository(db)
        self.user_repo = UserRepository(db)
    
    def create_vehicle(
        self, 
        vehicle_in: VehicleCreate, 
        current_user: UserModel
    ) -> VehicleModel:
        """Create a new vehicle with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) registering vehicle for user ID {vehicle_in.user_id}")
        
        user = self.user_repo.get_by_id(vehicle_in.user_id)
        if not user:
            logger.error(f"Vehicle registration failed: User ID {vehicle_in.user_id} not found")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Authorization
        self._validate_create_permission(current_user, user)
        
        # Check plate uniqueness
        if self.vehicle_repo.plate_exists(vehicle_in.plate_number):
            logger.warning(f"Vehicle registration failed: Plate {vehicle_in.plate_number} already exists")
            raise HTTPException(status_code=400, detail="Vehicle plate already exists")
        
        vehicle_data = {
            "user_id": vehicle_in.user_id,
            "plate_number": vehicle_in.plate_number,
        }
        
        vehicle = self.vehicle_repo.create(vehicle_data, created_by=current_user.id)
        logger.info(f"Vehicle registered successfully: {vehicle.plate_number} (ID: {vehicle.id})")
        return vehicle
    
    def get_vehicle_by_id(self, vehicle_id: int) -> VehicleModel:
        """Get vehicle by ID or raise exception."""
        vehicle = self.vehicle_repo.get_by_id(vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return vehicle
    
    def list_vehicles(
        self, 
        current_user: UserModel, 
        user_id: int = None, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[VehicleModel]:
        """List vehicles based on current user's role."""
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching vehicles")
        
        if user_id:
            vehicles = self.vehicle_repo.get_vehicles_by_user(user_id, skip, limit)
        else:
            vehicles = self.vehicle_repo.get_all(skip, limit)
        
        if current_user.role == UserRole.ADMIN:
            return vehicles
        
        if current_user.role == UserRole.SITE_MANAGER:
            complex_ids = [c.id for c in current_user.assigned_complexes]
            return [v for v in vehicles if any(b.complex_id in complex_ids for b in v.user.assigned_buildings)]
        
        # Residents can only see their own vehicles
        return [v for v in vehicles if v.user_id == current_user.id]
    
    def update_vehicle(
        self, 
        vehicle_id: int, 
        vehicle_in: VehicleUpdate, 
        current_user: UserModel
    ) -> VehicleModel:
        """Update a vehicle with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) updating vehicle ID {vehicle_id}")
        
        vehicle = self.vehicle_repo.get_by_id(vehicle_id)
        if not vehicle:
            logger.error(f"Update failed: Vehicle ID {vehicle_id} not found")
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Authorization
        self._validate_modify_permission(current_user, vehicle)
        
        update_data = {}
        
        if vehicle_in.plate_number:
            if self.vehicle_repo.plate_exists(vehicle_in.plate_number, exclude_id=vehicle_id):
                logger.warning(f"Update failed: Plate {vehicle_in.plate_number} already exists")
                raise HTTPException(status_code=400, detail="Vehicle plate already exists")
            update_data["plate_number"] = vehicle_in.plate_number
        
        vehicle = self.vehicle_repo.update(vehicle, update_data, updated_by=current_user.id)
        logger.info(f"Vehicle ID {vehicle_id} updated successfully by {current_user.username}")
        return vehicle
    
    def delete_vehicle(self, vehicle_id: int, current_user: UserModel) -> dict:
        """Delete a vehicle with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) deleting vehicle ID {vehicle_id}")
        
        vehicle = self.vehicle_repo.get_by_id(vehicle_id)
        if not vehicle:
            logger.error(f"Deletion failed: Vehicle ID {vehicle_id} not found")
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        self._validate_modify_permission(current_user, vehicle)
        
        self.vehicle_repo.delete(vehicle)
        logger.info(f"Vehicle ID {vehicle_id} deleted successfully by {current_user.username}")
        return {"message": "Vehicle deleted successfully"}
    
    # Private validation methods
    def _validate_create_permission(self, current_user: UserModel, target_user: UserModel):
        """Validate if current user can create vehicles for the target user."""
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.id == target_user.id:
            return
        
        if current_user.role == UserRole.SITE_MANAGER:
            complex_ids = [c.id for c in current_user.assigned_complexes]
            resident_complex_ids = [b.complex_id for b in target_user.assigned_buildings]
            if set(resident_complex_ids).intersection(set(complex_ids)):
                return
            logger.warning(f"Unauthorized vehicle registration attempt by manager {current_user.username} for unrelated resident ID {target_user.id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        logger.warning(f"Unauthorized vehicle registration attempt by {current_user.username}")
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    def _validate_modify_permission(self, current_user: UserModel, vehicle: VehicleModel):
        """Validate if current user can modify the vehicle."""
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.id == vehicle.user_id:
            return
        
        if current_user.role == UserRole.SITE_MANAGER:
            complex_ids = [c.id for c in current_user.assigned_complexes]
            resident_complex_ids = [b.complex_id for b in vehicle.user.assigned_buildings]
            if set(resident_complex_ids).intersection(set(complex_ids)):
                return
            logger.warning(f"Unauthorized update attempt by manager {current_user.username} for unrelated vehicle ID {vehicle.id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        logger.warning(f"Unauthorized update attempt on vehicle ID {vehicle.id} by {current_user.username}")
        raise HTTPException(status_code=403, detail="Not enough permissions")
