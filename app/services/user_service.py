from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import UserRepository, ComplexRepository, BuildingRepository
from app.models.models import UserModel
from app.core.security import get_password_hash
from app.core.entities import UserRole
from app.api.v1.schemas import UserCreate, UserUpdate
from app.core.logging_config import logger


class UserService:
    """Service for user-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.complex_repo = ComplexRepository(db)
        self.building_repo = BuildingRepository(db)
    
    def create_user(
        self, 
        user_in: UserCreate, 
        current_user: UserModel
    ) -> UserModel:
        """Create a new user with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) is creating a new user: {user_in.username}")
        
        # Authorization checks
        self._validate_create_permission(current_user, user_in.role)
        
        # Check uniqueness
        self._validate_unique_user(user_in.username, user_in.email)
        
        # Create user
        user_data = {
            "username": user_in.username,
            "email": user_in.email,
            "hashed_password": get_password_hash(user_in.password),
            "role": user_in.role,
            "is_active": user_in.is_active,
            "contact": user_in.contact,
            "description": user_in.description,
        }
        
        new_user = self.user_repo.create(user_data, created_by=current_user.id)
        
        # If manager creates user, auto-assign to manager's complexes
        if current_user.role == UserRole.SITE_MANAGER:
            new_user.assigned_complexes = list(current_user.assigned_complexes)
            self.db.commit()
            self.db.refresh(new_user)
        
        logger.info(f"User created successfully: {new_user.username} (ID: {new_user.id})")
        return new_user
    
    def get_user_by_id(self, user_id: int) -> Optional[UserModel]:
        """Get user by ID."""
        return self.user_repo.get_by_id(user_id)
    
    def get_current_user(self, user_id: int) -> UserModel:
        """Get current user or raise exception."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    
    def list_users(
        self, 
        current_user: UserModel, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[UserModel]:
        """List users based on current user's role."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) listing users")
        
        if current_user.role == UserRole.ADMIN:
            return self.user_repo.get_all(skip=skip, limit=limit)
        else:
            return [current_user]
    
    def update_user(
        self, 
        user_id: int, 
        user_in: UserUpdate, 
        current_user: UserModel
    ) -> UserModel:
        """Update a user with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) updating user ID: {user_id}")
        
        user = self.user_repo.get_by_id(user_id)
        if not user:
            logger.error(f"User update failed: User ID {user_id} not found")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Authorization
        self._validate_update_permission(current_user, user)
        
        # Prepare update data
        update_data = {}
        
        if user_in.email:
            self._validate_unique_email(user_in.email, exclude_user_id=user_id)
            update_data["email"] = user_in.email
        
        if user_in.role and current_user.role == UserRole.ADMIN:
            update_data["role"] = user_in.role
        
        if user_in.password:
            update_data["hashed_password"] = get_password_hash(user_in.password)
        
        if user_in.is_active is not None:
            update_data["is_active"] = user_in.is_active
        
        if user_in.contact is not None:
            update_data["contact"] = user_in.contact
        
        if user_in.description is not None:
            update_data["description"] = user_in.description
        
        # Update user
        user = self.user_repo.update(user, update_data, updated_by=current_user.id)
        
        # Handle complex and building assignments
        if user_in.complex_ids is not None:
            self._validate_complexes_exist(user_in.complex_ids)
            self.user_repo.set_assigned_complexes(user, user_in.complex_ids)
        
        if user_in.building_ids is not None:
            self._validate_buildings_exist(user_in.building_ids)
            self.user_repo.set_assigned_buildings(user, user_in.building_ids)
        
        logger.info(f"User ID {user_id} updated successfully by {current_user.username}")
        return user
    
    def delete_user(self, user_id: int, current_user: UserModel) -> dict:
        """Delete a user (admin only)."""
        logger.info(f"Admin {current_user.username} (ID: {current_user.id}) deleting user ID: {user_id}")
        
        user = self.user_repo.get_by_id(user_id)
        if not user:
            logger.error(f"User deletion failed: User ID {user_id} not found")
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.username == "admin":
            logger.critical(f"Attempt to delete super admin by {current_user.username}")
            raise HTTPException(status_code=400, detail="Cannot delete super admin")
        
        self.user_repo.delete(user)
        logger.info(f"User ID {user_id} deleted successfully by {current_user.username}")
        return {"message": "User deleted successfully"}
    
    def get_users_in_complex(
        self, 
        complex_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[UserModel]:
        """Get all users in a complex."""
        return self.user_repo.get_users_in_complex(complex_id, skip, limit)
    
    # Private validation methods
    def _validate_create_permission(self, current_user: UserModel, target_role: UserRole):
        """Validate if current user can create a user with the given role."""
        if current_user.role == UserRole.ADMIN:
            return
        elif current_user.role == UserRole.SITE_MANAGER:
            if target_role == UserRole.ADMIN:
                logger.warning(f"Unauthorized admin creation attempt by {current_user.username}")
                raise HTTPException(status_code=403, detail="Site managers cannot create admins")
        else:
            logger.warning(f"Unauthorized user creation attempt by {current_user.username}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    def _validate_update_permission(self, current_user: UserModel, target_user: UserModel):
        """Validate if current user can update the target user."""
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.id == target_user.id:
            return
        if current_user.role == UserRole.SITE_MANAGER:
            manager_complex_ids = {c.id for c in current_user.assigned_complexes}
            user_complex_ids = {c.id for c in target_user.assigned_complexes}
            user_building_complex_ids = {b.complex_id for b in target_user.assigned_buildings}
            all_user_related_complex_ids = user_complex_ids.union(user_building_complex_ids)
            
            if not manager_complex_ids.intersection(all_user_related_complex_ids):
                logger.warning(f"Unauthorized update attempt on user ID {target_user.id} by manager {current_user.username}")
                raise HTTPException(status_code=403, detail="Managers can only edit users in their complexes")
            return
        
        logger.warning(f"Unauthorized update attempt on user ID {target_user.id} by {current_user.username}")
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    def _validate_unique_user(self, username: str, email: str):
        """Validate that username and email are unique."""
        if self.user_repo.username_exists(username):
            raise HTTPException(status_code=400, detail="Username already exists")
        if self.user_repo.email_exists(email):
            raise HTTPException(status_code=400, detail="Email already exists")
    
    def _validate_unique_email(self, email: str, exclude_user_id: int):
        """Validate that email is unique (excluding specific user)."""
        if self.user_repo.email_exists(email, exclude_user_id):
            raise HTTPException(status_code=400, detail="Email already exists")
    
    def _validate_complexes_exist(self, complex_ids: List[int]):
        """Validate that all complexes exist."""
        for complex_id in complex_ids:
            if not self.complex_repo.exists(complex_id):
                raise HTTPException(status_code=404, detail=f"Complex ID {complex_id} not found")
    
    def _validate_buildings_exist(self, building_ids: List[int]):
        """Validate that all buildings exist."""
        for building_id in building_ids:
            if not self.building_repo.exists(building_id):
                raise HTTPException(status_code=404, detail=f"Building ID {building_id} not found")
