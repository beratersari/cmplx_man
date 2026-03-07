from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import UserRepository, ComplexRepository, BuildingRepository
from app.models.models import UserModel, BuildingModel
from app.core.entities import UserRole
from app.api.v1.schemas import BuildingCreate, AdminBuildingCreate, BuildingAssignment, UserOut
from app.core.logging_config import logger


class BuildingService:
    """Service for building-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.building_repo = BuildingRepository(db)
        self.complex_repo = ComplexRepository(db)
        self.user_repo = UserRepository(db)
    
    def create_building_in_my_complex(
        self, 
        building_in: BuildingCreate, 
        current_user: UserModel
    ) -> BuildingModel:
        """
        Create a new building in the manager's complex.
        Complex ID is extracted from the authenticated manager's context.
        """
        logger.info(f"Manager {current_user.username} (ID: {current_user.id}) creating building: {building_in.name}")
        
        # Validate that user is a manager
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized building creation attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only site managers can use this endpoint")
        
        # Get manager's complex (managers are assigned to at most one complex)
        if not current_user.assigned_complexes:
            logger.warning(f"Manager {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        complex_obj = current_user.assigned_complexes[0]
        
        # Check if building already exists in complex
        if self.building_repo.building_exists_in_complex(building_in.name, complex_obj.id):
            logger.warning(f"Building creation failed: {building_in.name} already exists in complex ID {complex_obj.id}")
            raise HTTPException(status_code=400, detail="Building already exists in this complex")
        
        building_data = {
            "name": building_in.name,
            "complex_id": complex_obj.id,
        }
        
        new_building = self.building_repo.create(building_data, created_by=current_user.id)
        logger.info(f"Building created successfully: {new_building.name} (ID: {new_building.id}) in complex ID {complex_obj.id}")
        return new_building
    
    def admin_create_building(
        self, 
        building_in: AdminBuildingCreate, 
        current_user: UserModel
    ) -> BuildingModel:
        """
        Admin endpoint to create a building in any specific complex.
        """
        logger.info(f"Admin {current_user.username} (ID: {current_user.id}) creating building: {building_in.name} for complex ID {building_in.complex_id}")
        
        # Check complex exists
        complex_obj = self.complex_repo.get_by_id(building_in.complex_id)
        if not complex_obj:
            logger.error(f"Building creation failed: Complex ID {building_in.complex_id} not found")
            raise HTTPException(status_code=404, detail="Residential complex not found")
        
        # Check if building already exists in complex
        if self.building_repo.building_exists_in_complex(building_in.name, building_in.complex_id):
            logger.warning(f"Building creation failed: {building_in.name} already exists in complex ID {building_in.complex_id}")
            raise HTTPException(status_code=400, detail="Building already exists in this complex")
        
        building_data = {
            "name": building_in.name,
            "complex_id": building_in.complex_id,
        }
        
        new_building = self.building_repo.create(building_data, created_by=current_user.id)
        logger.info(f"Building created successfully: {new_building.name} (ID: {new_building.id})")
        return new_building
    
    def get_building_by_id(self, building_id: int) -> BuildingModel:
        """Get building by ID or raise exception."""
        building = self.building_repo.get_by_id(building_id)
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        return building
    
    def list_buildings(
        self, 
        current_user: UserModel, 
        complex_id: int = None, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[BuildingModel]:
        """List buildings based on current user's role."""
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching buildings")
        
        if complex_id:
            buildings = self.building_repo.get_buildings_by_complex(complex_id, skip, limit)
        else:
            buildings = self.building_repo.get_all(skip, limit)
        
        if current_user.role == UserRole.ADMIN:
            return buildings
        
        # Filter buildings by complexes user is assigned to
        assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
        filtered = [b for b in buildings if b.complex_id in assigned_complex_ids]
        return filtered
    
    def update_my_building(
        self, 
        building_id: int, 
        building_in: BuildingCreate, 
        current_user: UserModel
    ) -> BuildingModel:
        """
        Update a building in the manager's complex.
        Validates that the building belongs to the manager's complex.
        """
        logger.info(f"Manager {current_user.username} (ID: {current_user.id}) updating building ID {building_id}")
        
        # Validate that user is a manager
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized update attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only site managers can use this endpoint")
        
        # Get manager's complex
        if not current_user.assigned_complexes:
            logger.warning(f"Manager {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        manager_complex = current_user.assigned_complexes[0]
        
        building = self.building_repo.get_by_id(building_id)
        if not building:
            logger.error(f"Update failed: Building ID {building_id} not found")
            raise HTTPException(status_code=404, detail="Building not found")
        
        # Validate that building belongs to manager's complex
        if building.complex_id != manager_complex.id:
            logger.warning(f"Unauthorized update attempt by {current_user.username} for building ID {building_id} (not in their complex)")
            raise HTTPException(status_code=403, detail="Not enough permissions - building is not in your complex")
        
        # Check if name already exists in the complex
        if self.building_repo.building_exists_in_complex(
            building_in.name, manager_complex.id, exclude_id=building_id
        ):
            logger.warning(f"Update failed: Building name {building_in.name} already exists in complex ID {manager_complex.id}")
            raise HTTPException(status_code=400, detail="Building with this name already exists in this complex")
        
        update_data = {
            "name": building_in.name,
        }
        
        building = self.building_repo.update(building, update_data, updated_by=current_user.id)
        logger.info(f"Building ID {building_id} updated successfully by {current_user.username}")
        return building
    
    def admin_update_building(
        self, 
        building_id: int, 
        building_in: AdminBuildingCreate, 
        current_user: UserModel
    ) -> BuildingModel:
        """
        Admin endpoint to update any building.
        Allows updating building name and complex_id.
        """
        logger.info(f"Admin {current_user.username} (ID: {current_user.id}) updating building ID {building_id}")
        
        building = self.building_repo.get_by_id(building_id)
        if not building:
            logger.error(f"Update failed: Building ID {building_id} not found")
            raise HTTPException(status_code=404, detail="Building not found")
        
        # Check if name already exists in same complex
        if self.building_repo.building_exists_in_complex(
            building_in.name, building_in.complex_id, exclude_id=building_id
        ):
            logger.warning(f"Update failed: Building name {building_in.name} already exists in complex ID {building_in.complex_id}")
            raise HTTPException(status_code=400, detail="Building with this name already exists in this complex")
        
        update_data = {
            "name": building_in.name,
            "complex_id": building_in.complex_id,
        }
        
        building = self.building_repo.update(building, update_data, updated_by=current_user.id)
        logger.info(f"Building ID {building_id} updated successfully by {current_user.username}")
        return building
    
    def delete_building(self, building_id: int, current_user: UserModel) -> dict:
        """Delete a building with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) deleting building ID {building_id}")
        
        building = self.building_repo.get_by_id(building_id)
        if not building:
            logger.error(f"Deletion failed: Building ID {building_id} not found")
            raise HTTPException(status_code=404, detail="Building not found")
        
        self._validate_modify_permission(current_user, building)
        
        self.building_repo.delete(building)
        logger.info(f"Building ID {building_id} deleted successfully by {current_user.username}")
        return {"message": "Building deleted successfully"}
    
    def assign_resident(
        self, 
        assignment: BuildingAssignment, 
        current_user: UserModel
    ) -> dict:
        """Assign a resident to a building with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) assigning resident ID {assignment.user_id} to building ID {assignment.building_id}")
        
        building = self.building_repo.get_by_id(assignment.building_id)
        if not building:
            logger.error(f"Assignment failed: Building ID {assignment.building_id} not found")
            raise HTTPException(status_code=404, detail="Building not found")
        
        user = self.user_repo.get_by_id(assignment.user_id)
        if not user:
            logger.error(f"Assignment failed: User ID {assignment.user_id} not found")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Authorization
        self._validate_assignment_permission(current_user, building, user)
        
        # Check if user is assigned to the building's complex
        if building.complex not in user.assigned_complexes:
            logger.warning(
                f"Assignment failed: User ID {assignment.user_id} is not assigned to complex ID {building.complex_id}"
            )
            raise HTTPException(
                status_code=400,
                detail="User must be assigned to the building's complex before building assignment"
            )
        
        # Check if already assigned
        if user in building.residents:
            return {"message": "User assigned successfully"}
        
        # Enforce single building limit
        if len(user.assigned_buildings) > 0:
            logger.warning(f"Assignment failed: User ID {user.id} is already assigned to a building")
            raise HTTPException(
                status_code=400,
                detail="A user can belong to at most one building"
            )
        
        building.residents.append(user)
        self.db.commit()
        
        logger.info(f"User ID {assignment.user_id} assigned successfully to building ID {assignment.building_id} by {current_user.username}")
        return {"message": "User assigned successfully"}
    
    def get_building_users(
        self, 
        building_id: int, 
        current_user: UserModel, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[UserModel]:
        """Get all users in a building with authorization check."""
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching users for building ID {building_id}")
        
        building = self.building_repo.get_by_id(building_id)
        if not building:
            raise HTTPException(status_code=404, detail="Building not found")
        
        self._validate_access_permission(current_user, building)
        
        return self.building_repo.get_users_in_building(building_id, skip, limit)
    
    # Private validation methods
    def _validate_modify_permission(self, current_user: UserModel, building: BuildingModel):
        """Validate if current user can modify the building."""
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.role == UserRole.SITE_MANAGER:
            if building.complex in current_user.assigned_complexes:
                return
            logger.warning(f"Unauthorized update attempt by {current_user.username} for building ID {building.id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        logger.warning(f"Unauthorized update attempt by {current_user.username} (not a manager)")
        raise HTTPException(status_code=403, detail="Only managers can update buildings")
    
    def _validate_assignment_permission(
        self, 
        current_user: UserModel, 
        building: BuildingModel, 
        user: UserModel
    ):
        """Validate if current user can assign users to the building."""
        if current_user.role == UserRole.ADMIN:
            return
        
        if current_user.role == UserRole.SITE_MANAGER:
            if building.complex not in current_user.assigned_complexes:
                logger.warning(f"Unauthorized assignment attempt by {current_user.username} for building ID {building.id}")
                raise HTTPException(status_code=403, detail="Not enough permissions")
            
            manager_complex_ids = {c.id for c in current_user.assigned_complexes}
            user_complex_ids = {c.id for c in user.assigned_complexes}
            if not user_complex_ids.intersection(manager_complex_ids):
                logger.warning(
                    f"Unauthorized assignment attempt: Manager {current_user.username} cannot assign user ID {user.id} outside their complexes"
                )
                raise HTTPException(status_code=403, detail="Managers can only assign users already in their complexes")
            return
        
        logger.warning(f"Unauthorized assignment attempt by {current_user.username} (not a manager)")
        raise HTTPException(status_code=403, detail="Only managers can assign users to buildings")
    
    def _validate_access_permission(self, current_user: UserModel, building: BuildingModel):
        """Validate if current user can access the building."""
        if current_user.role == UserRole.ADMIN:
            return
        if building.complex in current_user.assigned_complexes:
            return
        raise HTTPException(status_code=403, detail="Not enough permissions")
