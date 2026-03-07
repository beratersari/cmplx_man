from typing import List, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import UserRepository, ComplexRepository
from app.models.models import UserModel, ResidentialComplexModel
from app.core.entities import UserRole
from app.api.v1.schemas import (
    ResidentialComplexCreate, 
    ComplexAssignment, 
    AdminComplexAssignment,
    UserOut
)
from app.core.logging_config import logger


class ComplexService:
    """Service for residential complex-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.complex_repo = ComplexRepository(db)
        self.user_repo = UserRepository(db)
    
    def create_complex(
        self, 
        complex_in: ResidentialComplexCreate, 
        current_user: UserModel
    ) -> ResidentialComplexModel:
        """Create a new complex (admin only)."""
        logger.info(f"Admin {current_user.username} (ID: {current_user.id}) creating complex: {complex_in.name}")
        
        # Check if name already exists
        if self.complex_repo.name_exists(complex_in.name):
            logger.warning(f"Complex creation failed: {complex_in.name} already exists")
            raise HTTPException(status_code=400, detail="Residential complex with this name already exists")
        
        complex_data = {
            "name": complex_in.name,
            "address": complex_in.address,
        }
        
        new_complex = self.complex_repo.create(complex_data, created_by=current_user.id)
        logger.info(f"Complex created successfully: {new_complex.name} (ID: {new_complex.id})")
        return new_complex
    
    def get_complex_by_id(self, complex_id: int) -> ResidentialComplexModel:
        """Get complex by ID or raise exception."""
        complex_obj = self.complex_repo.get_by_id(complex_id)
        if not complex_obj:
            raise HTTPException(status_code=404, detail="Complex not found")
        return complex_obj
    
    def list_complexes(
        self, 
        current_user: UserModel, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[ResidentialComplexModel]:
        """List complexes based on current user's role."""
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching complexes")
        
        if current_user.role == UserRole.ADMIN:
            return self.complex_repo.get_all(skip=skip, limit=limit)
        else:
            return current_user.assigned_complexes[skip:skip + limit]
    
    def update_complex(
        self, 
        complex_id: int, 
        complex_in: ResidentialComplexCreate, 
        current_user: UserModel
    ) -> ResidentialComplexModel:
        """Update a complex with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) updating complex ID {complex_id}")
        
        complex_obj = self.complex_repo.get_by_id(complex_id)
        if not complex_obj:
            logger.error(f"Update failed: Complex ID {complex_id} not found")
            raise HTTPException(status_code=404, detail="Complex not found")
        
        # Authorization
        self._validate_update_permission(current_user, complex_obj)
        
        # Check if name already exists
        if self.complex_repo.name_exists(complex_in.name, exclude_id=complex_id):
            logger.warning(f"Update failed: Complex name {complex_in.name} already exists")
            raise HTTPException(status_code=400, detail="Residential complex with this name already exists")
        
        update_data = {
            "name": complex_in.name,
            "address": complex_in.address,
        }
        
        complex_obj = self.complex_repo.update(complex_obj, update_data, updated_by=current_user.id)
        logger.info(f"Complex ID {complex_id} updated successfully by {current_user.username}")
        return complex_obj
    
    def delete_complex(self, complex_id: int, current_user: UserModel) -> dict:
        """Delete a complex (admin only)."""
        logger.info(f"Admin {current_user.username} (ID: {current_user.id}) deleting complex ID {complex_id}")
        
        complex_obj = self.complex_repo.get_by_id(complex_id)
        if not complex_obj:
            logger.error(f"Deletion failed: Complex ID {complex_id} not found")
            raise HTTPException(status_code=404, detail="Complex not found")
        
        self.complex_repo.delete(complex_obj)
        logger.info(f"Complex ID {complex_id} deleted successfully by {current_user.username}")
        return {"message": "Residential complex deleted successfully"}
    
    def assign_user_to_my_complex(
        self, 
        assignment: ComplexAssignment, 
        current_user: UserModel
    ) -> dict:
        """
        Assign a user to the manager's complex.
        Complex ID is extracted from the authenticated manager's context.
        """
        logger.info(f"Manager {current_user.username} (ID: {current_user.id}) assigning user ID {assignment.user_id} to their complex")
        
        # Validate that user is a manager
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized assignment attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only site managers can use this endpoint")
        
        # Get manager's complex (managers are assigned to at most one complex)
        if not current_user.assigned_complexes:
            logger.warning(f"Manager {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        complex_obj = current_user.assigned_complexes[0]
        
        target_user = self.user_repo.get_by_id(assignment.user_id)
        if not target_user:
            logger.error(f"Assignment failed: User ID {assignment.user_id} not found")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user is admin
        if target_user.role == UserRole.ADMIN:
            logger.warning(f"Attempt to assign admin ID {assignment.user_id} to complex")
            raise HTTPException(status_code=400, detail="Cannot assign Admin to a complex")
        
        # Check if target user is already in manager's complex
        manager_complex_ids = {c.id for c in current_user.assigned_complexes}
        target_user_complex_ids = {c.id for c in target_user.assigned_complexes}
        if not target_user_complex_ids.intersection(manager_complex_ids):
            logger.warning(
                f"Unauthorized assignment attempt: Manager {current_user.username} cannot assign user ID {target_user.id} outside their complexes"
            )
            raise HTTPException(status_code=403, detail="Managers can only assign users already in their complexes")
        
        # Check single complex constraint
        if target_user.assigned_complexes and complex_obj not in target_user.assigned_complexes:
            logger.warning(f"Assignment failed: User ID {assignment.user_id} already assigned to another complex")
            raise HTTPException(status_code=400, detail="A user can belong to at most one complex")
        
        # Assign user to complex
        if complex_obj not in target_user.assigned_complexes:
            target_user.assigned_complexes.append(complex_obj)
            self.db.commit()
        
        logger.info(f"User ID {assignment.user_id} assigned successfully to complex ID {complex_obj.id} by {current_user.username}")
        return {"message": "User assigned successfully"}
    
    def admin_assign_user_to_complex(
        self, 
        assignment: AdminComplexAssignment, 
        current_user: UserModel
    ) -> dict:
        """
        Admin endpoint to assign a user to any specific complex.
        """
        logger.info(f"Admin {current_user.username} (ID: {current_user.id}) assigning user ID {assignment.user_id} to complex ID {assignment.complex_id}")
        
        complex_obj = self.complex_repo.get_by_id(assignment.complex_id)
        if not complex_obj:
            logger.error(f"Assignment failed: Complex ID {assignment.complex_id} not found")
            raise HTTPException(status_code=404, detail="Complex not found")
        
        target_user = self.user_repo.get_by_id(assignment.user_id)
        if not target_user:
            logger.error(f"Assignment failed: User ID {assignment.user_id} not found")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if user is admin
        if target_user.role == UserRole.ADMIN:
            logger.warning(f"Attempt to assign admin ID {assignment.user_id} to complex ID {assignment.complex_id}")
            raise HTTPException(status_code=400, detail="Cannot assign Admin to a complex")
        
        # Check single complex constraint
        if target_user.assigned_complexes and complex_obj not in target_user.assigned_complexes:
            logger.warning(f"Assignment failed: User ID {assignment.user_id} already assigned to another complex")
            raise HTTPException(status_code=400, detail="A user can belong to at most one complex")
        
        # Assign user to complex
        if complex_obj not in target_user.assigned_complexes:
            target_user.assigned_complexes.append(complex_obj)
            self.db.commit()
        
        logger.info(f"User ID {assignment.user_id} assigned successfully to complex ID {assignment.complex_id} by {current_user.username}")
        return {"message": "User assigned successfully"}
    
    def get_my_complex_users(
        self, 
        current_user: UserModel, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[UserModel]:
        """
        Get all users in the manager's complex.
        Complex ID is extracted from the authenticated manager's context.
        """
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching users for their complex")
        
        # Validate that user is a manager
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized access attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only site managers can use this endpoint")
        
        # Get manager's complex
        if not current_user.assigned_complexes:
            logger.warning(f"Manager {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        complex_obj = current_user.assigned_complexes[0]
        
        return self.user_repo.get_users_in_complex(complex_obj.id, skip, limit)
    
    def admin_get_complex_users(
        self, 
        complex_id: int, 
        current_user: UserModel, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[UserModel]:
        """Admin endpoint to get all users in any specific complex."""
        logger.trace(f"Admin {current_user.username} (ID: {current_user.id}) fetching users for complex ID {complex_id}")
        
        complex_obj = self.complex_repo.get_by_id(complex_id)
        if not complex_obj:
            raise HTTPException(status_code=404, detail="Complex not found")
        
        return self.user_repo.get_users_in_complex(complex_id, skip, limit)
    
    def get_my_complex_users_by_role(
        self, 
        current_user: UserModel
    ) -> Dict[str, List[UserOut]]:
        """
        Get users in the manager's complex grouped by role.
        Complex ID is extracted from the authenticated manager's context.
        """
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching users by role for their complex")
        
        # Validate that user is a manager
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized access attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only site managers can use this endpoint")
        
        # Get manager's complex
        if not current_user.assigned_complexes:
            logger.warning(f"Manager {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        complex_id = current_user.assigned_complexes[0].id
        users = self.user_repo.get_users_in_complex(complex_id)
        
        users_by_role: Dict[str, List[UserOut]] = {}
        for user in users:
            role_key = user.role.value
            users_by_role.setdefault(role_key, []).append(UserOut.from_orm(user))
        
        return users_by_role
    
    def admin_get_complex_users_by_role(
        self, 
        complex_id: int, 
        current_user: UserModel
    ) -> Dict[str, List[UserOut]]:
        """Admin endpoint to get users in any specific complex grouped by role."""
        logger.trace(f"Admin {current_user.username} (ID: {current_user.id}) fetching users by role for complex ID {complex_id}")
        
        complex_obj = self.complex_repo.get_by_id(complex_id)
        if not complex_obj:
            raise HTTPException(status_code=404, detail="Complex not found")
        
        users = self.user_repo.get_users_in_complex(complex_id)
        
        users_by_role: Dict[str, List[UserOut]] = {}
        for user in users:
            role_key = user.role.value
            users_by_role.setdefault(role_key, []).append(UserOut.from_orm(user))
        
        return users_by_role
    
    def update_my_complex(
        self, 
        complex_in: ResidentialComplexCreate, 
        current_user: UserModel
    ) -> ResidentialComplexModel:
        """
        Update the manager's complex details.
        Complex ID is extracted from the authenticated manager's context.
        """
        logger.info(f"Manager {current_user.username} (ID: {current_user.id}) updating their complex")
        
        # Validate that user is a manager
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized update attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only site managers can use this endpoint")
        
        # Get manager's complex
        if not current_user.assigned_complexes:
            logger.warning(f"Manager {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        complex_obj = current_user.assigned_complexes[0]
        complex_id = complex_obj.id
        
        # Check if name already exists (excluding current complex)
        if self.complex_repo.name_exists(complex_in.name, exclude_id=complex_id):
            logger.warning(f"Update failed: Complex name {complex_in.name} already exists")
            raise HTTPException(status_code=400, detail="Residential complex with this name already exists")
        
        update_data = {
            "name": complex_in.name,
            "address": complex_in.address,
        }
        
        complex_obj = self.complex_repo.update(complex_obj, update_data, updated_by=current_user.id)
        logger.info(f"Complex ID {complex_id} updated successfully by {current_user.username}")
        return complex_obj
    
    def get_my_complex(self, current_user: UserModel) -> ResidentialComplexModel:
        """
        Get the manager's assigned complex.
        """
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching their complex")
        
        # Validate that user is a manager
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized access attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only site managers can use this endpoint")
        
        # Get manager's complex
        if not current_user.assigned_complexes:
            logger.warning(f"Manager {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        return current_user.assigned_complexes[0]
    
    # Private validation methods
    def _validate_update_permission(self, current_user: UserModel, complex_obj: ResidentialComplexModel):
        """Validate if current user can update the complex."""
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.role == UserRole.SITE_MANAGER:
            if complex_obj in current_user.assigned_complexes:
                return
            logger.warning(f"Unauthorized update attempt by {current_user.username} for complex ID {complex_obj.id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        logger.warning(f"Unauthorized update attempt by {current_user.username} (not a manager)")
        raise HTTPException(status_code=403, detail="Only managers can update complexes")
    
    def _validate_access_permission(self, current_user: UserModel, complex_obj: ResidentialComplexModel):
        """Validate if current user can access the complex."""
        if current_user.role == UserRole.ADMIN:
            return
        if complex_obj in current_user.assigned_complexes:
            return
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    def _validate_manager_permission(self, current_user: UserModel, complex_obj: ResidentialComplexModel):
        """Validate if current user is a manager of the complex."""
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.role == UserRole.SITE_MANAGER:
            if complex_obj in current_user.assigned_complexes:
                return
            raise HTTPException(status_code=403, detail="Not enough permissions")
        raise HTTPException(status_code=403, detail="Only managers can access this view")
