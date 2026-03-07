from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import IssueCategoryRepository, ComplexRepository
from app.models.models import UserModel, IssueCategoryModel
from app.core.entities import UserRole
from app.api.v1.schemas import IssueCategoryCreate, AdminIssueCategoryCreate, IssueCategoryUpdate
from app.core.logging_config import logger


class IssueCategoryService:
    """Service for category-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.category_repo = IssueCategoryRepository(db)
        self.complex_repo = ComplexRepository(db)
    
    def create_category_in_my_complex(
        self, 
        category_in: IssueCategoryCreate, 
        current_user: UserModel
    ) -> IssueCategoryModel:
        """
        Create a new category in the manager's complex.
        Complex ID is extracted from the authenticated manager's context.
        """
        logger.info(f"Manager {current_user.username} (ID: {current_user.id}) creating category: {category_in.name}")
        
        # Validate that user is a manager
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized category creation attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only site managers can use this endpoint")
        
        # Get manager's complex (managers are assigned to at most one complex)
        if not current_user.assigned_complexes:
            logger.warning(f"Manager {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        complex_obj = current_user.assigned_complexes[0]
        
        # Check if category already exists in complex
        if self.category_repo.category_exists_in_complex(category_in.name, complex_obj.id):
            logger.warning(f"Category creation failed: {category_in.name} already exists in complex ID {complex_obj.id}")
            raise HTTPException(status_code=400, detail="Category already exists in this complex")
        
        category_data = {
            "name": category_in.name,
            "complex_id": complex_obj.id,
        }
        
        new_category = self.category_repo.create(category_data, created_by=current_user.id)
        logger.info(f"Category created successfully: {new_category.name} (ID: {new_category.id}) in complex ID {complex_obj.id}")
        return new_category
    
    def admin_create_category(
        self, 
        category_in: AdminIssueCategoryCreate, 
        current_user: UserModel
    ) -> IssueCategoryModel:
        """
        Admin endpoint to create a category in any specific complex.
        """
        logger.info(f"Admin {current_user.username} (ID: {current_user.id}) creating category: {category_in.name} for complex ID {category_in.complex_id}")
        
        # Check complex exists
        complex_obj = self.complex_repo.get_by_id(category_in.complex_id)
        if not complex_obj:
            logger.error(f"Category creation failed: Complex ID {category_in.complex_id} not found")
            raise HTTPException(status_code=404, detail="Residential complex not found")
        
        # Check if category already exists in complex
        if self.category_repo.category_exists_in_complex(category_in.name, category_in.complex_id):
            logger.warning(f"Category creation failed: {category_in.name} already exists in complex ID {category_in.complex_id}")
            raise HTTPException(status_code=400, detail="Category already exists in this complex")
        
        category_data = {
            "name": category_in.name,
            "complex_id": category_in.complex_id,
        }
        
        new_category = self.category_repo.create(category_data, created_by=current_user.id)
        logger.info(f"Category created successfully: {new_category.name} (ID: {new_category.id})")
        return new_category
    
    def get_category_by_id(self, category_id: int) -> IssueCategoryModel:
        """Get category by ID or raise exception."""
        category = self.category_repo.get_by_id(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        return category
    
    def list_categories(
        self, 
        current_user: UserModel, 
        complex_id: int = None, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[IssueCategoryModel]:
        """List categories based on current user's role."""
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching categories")
        
        if current_user.role == UserRole.ADMIN:
            if complex_id:
                return self.category_repo.get_categories_by_complex(complex_id, skip, limit)
            return self.category_repo.get_all(skip, limit)
        
        # For managers, return categories in their complex
        if current_user.role == UserRole.SITE_MANAGER:
            if not current_user.assigned_complexes:
                return []
            complex_obj = current_user.assigned_complexes[0]
            return self.category_repo.get_categories_by_complex(complex_obj.id, skip, limit)
        
        # For regular users, return categories in their assigned complex
        if current_user.assigned_complexes:
            complex_obj = current_user.assigned_complexes[0]
            return self.category_repo.get_categories_by_complex(complex_obj.id, skip, limit)
        
        return []
    
    def update_my_category(
        self, 
        category_id: int, 
        category_in: IssueCategoryUpdate, 
        current_user: UserModel
    ) -> IssueCategoryModel:
        """
        Update a category in the manager's complex.
        Validates that the category belongs to the manager's complex.
        """
        logger.info(f"Manager {current_user.username} (ID: {current_user.id}) updating category ID {category_id}")
        
        # Validate that user is a manager
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized update attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only site managers can use this endpoint")
        
        # Get manager's complex
        if not current_user.assigned_complexes:
            logger.warning(f"Manager {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        manager_complex = current_user.assigned_complexes[0]
        
        category = self.category_repo.get_by_id(category_id)
        if not category:
            logger.error(f"Update failed: Category ID {category_id} not found")
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Validate that category belongs to manager's complex
        if category.complex_id != manager_complex.id:
            logger.warning(f"Unauthorized update attempt by {current_user.username} for category ID {category_id} (not in their complex)")
            raise HTTPException(status_code=403, detail="Not enough permissions - category is not in your complex")
        
        # Check if name already exists in the complex
        if category_in.name and self.category_repo.category_exists_in_complex(
            category_in.name, manager_complex.id, exclude_id=category_id
        ):
            logger.warning(f"Update failed: Category name {category_in.name} already exists in complex ID {manager_complex.id}")
            raise HTTPException(status_code=400, detail="Category with this name already exists in this complex")
        
        update_data = {}
        if category_in.name:
            update_data["name"] = category_in.name
        
        category = self.category_repo.update(category, update_data, updated_by=current_user.id)
        logger.info(f"Category ID {category_id} updated successfully by {current_user.username}")
        return category
    
    def admin_update_category(
        self, 
        category_id: int, 
        category_in: AdminIssueCategoryCreate, 
        current_user: UserModel
    ) -> IssueCategoryModel:
        """
        Admin endpoint to update any category.
        Allows updating category name and complex_id.
        """
        logger.info(f"Admin {current_user.username} (ID: {current_user.id}) updating category ID {category_id}")
        
        category = self.category_repo.get_by_id(category_id)
        if not category:
            logger.error(f"Update failed: Category ID {category_id} not found")
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Check complex exists
        complex_obj = self.complex_repo.get_by_id(category_in.complex_id)
        if not complex_obj:
            logger.error(f"Update failed: Complex ID {category_in.complex_id} not found")
            raise HTTPException(status_code=404, detail="Residential complex not found")
        
        # Check if name already exists in same complex
        if self.category_repo.category_exists_in_complex(
            category_in.name, category_in.complex_id, exclude_id=category_id
        ):
            logger.warning(f"Update failed: Category name {category_in.name} already exists in complex ID {category_in.complex_id}")
            raise HTTPException(status_code=400, detail="Category with this name already exists in this complex")
        
        update_data = {
            "name": category_in.name,
            "complex_id": category_in.complex_id,
        }
        
        category = self.category_repo.update(category, update_data, updated_by=current_user.id)
        logger.info(f"Category ID {category_id} updated successfully by {current_user.username}")
        return category
    
    def delete_category(self, category_id: int, current_user: UserModel) -> dict:
        """Delete a category with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) deleting category ID {category_id}")
        
        category = self.category_repo.get_by_id(category_id)
        if not category:
            logger.error(f"Deletion failed: Category ID {category_id} not found")
            raise HTTPException(status_code=404, detail="Category not found")
        
        self._validate_modify_permission(current_user, category)
        
        self.category_repo.delete(category)
        logger.info(f"Category ID {category_id} deleted successfully by {current_user.username}")
        return {"message": "Category deleted successfully"}
    
    # Private validation methods
    def _validate_modify_permission(self, current_user: UserModel, category: IssueCategoryModel):
        """Validate if current user can modify the category."""
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.role == UserRole.SITE_MANAGER:
            if category.complex in current_user.assigned_complexes:
                return
            logger.warning(f"Unauthorized update attempt by {current_user.username} for category ID {category.id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        logger.warning(f"Unauthorized update attempt by {current_user.username} (not a manager)")
        raise HTTPException(status_code=403, detail="Only managers can update categories")
