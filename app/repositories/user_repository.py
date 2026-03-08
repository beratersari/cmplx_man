from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.models import UserModel
from app.core.entities import UserRole
from .base_repository import BaseRepository


class UserRepository(BaseRepository[UserModel]):
    """Repository for User entity operations."""
    
    def __init__(self, db: Session):
        super().__init__(db, UserModel)
    
    def get_by_username(self, username: str) -> Optional[UserModel]:
        """Get user by username."""
        return self.db.query(UserModel).filter(UserModel.username == username).first()
    
    def get_by_email(self, email: str) -> Optional[UserModel]:
        """Get user by email."""
        return self.db.query(UserModel).filter(UserModel.email == email).first()
    
    def get_all_admins(self, skip: int = 0, limit: int = 50) -> List[UserModel]:
        """Get all admin users."""
        return self.db.query(UserModel).filter(
            UserModel.role == UserRole.ADMIN
        ).offset(skip).limit(limit).all()
    
    def get_users_in_complex(
        self, 
        complex_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[UserModel]:
        """Get all users assigned to a complex (directly or via buildings)."""
        from app.models.models import ResidentialComplexModel, BuildingModel
        
        # Users directly assigned to complex
        assigned_users = self.db.query(UserModel).join(
            UserModel.assigned_complexes
        ).filter(
            ResidentialComplexModel.id == complex_id
        ).distinct().all()
        
        # Users assigned via buildings in the complex
        resident_users = self.db.query(UserModel).join(
            UserModel.assigned_buildings
        ).filter(
            BuildingModel.complex_id == complex_id
        ).distinct().all()
        
        # Combine and deduplicate
        combined = {user.id: user for user in assigned_users + resident_users}
        return list(combined.values())[skip:skip + limit]
    
    def username_exists(self, username: str, exclude_user_id: Optional[int] = None) -> bool:
        """Check if username already exists."""
        query = self.db.query(UserModel).filter(UserModel.username == username)
        if exclude_user_id:
            query = query.filter(UserModel.id != exclude_user_id)
        return query.first() is not None
    
    def email_exists(self, email: str, exclude_user_id: Optional[int] = None) -> bool:
        """Check if email already exists."""
        query = self.db.query(UserModel).filter(UserModel.email == email)
        if exclude_user_id:
            query = query.filter(UserModel.id != exclude_user_id)
        return query.first() is not None
    
    def assign_to_complex(self, user: UserModel, complex_id: int) -> None:
        """Assign user to a complex."""
        from app.models.models import ResidentialComplexModel
        complex_obj = self.db.query(ResidentialComplexModel).filter(
            ResidentialComplexModel.id == complex_id
        ).first()
        if complex_obj and complex_obj not in user.assigned_complexes:
            user.assigned_complexes.append(complex_obj)
            self.db.commit()
    
    def assign_to_building(self, user: UserModel, building_id: int) -> None:
        """Assign user to a building."""
        from app.models.models import BuildingModel
        building = self.db.query(BuildingModel).filter(
            BuildingModel.id == building_id
        ).first()
        if building and building not in user.assigned_buildings:
            user.assigned_buildings.append(building)
            self.db.commit()
    
    def set_assigned_complexes(self, user: UserModel, complex_ids: List[int]) -> None:
        """Set user's assigned complexes."""
        from app.models.models import ResidentialComplexModel
        complexes = self.db.query(ResidentialComplexModel).filter(
            ResidentialComplexModel.id.in_(complex_ids)
        ).all()
        user.assigned_complexes = complexes
        self.db.commit()
    
    def set_assigned_buildings(self, user: UserModel, building_ids: List[int]) -> None:
        """Set user's assigned buildings."""
        from app.models.models import BuildingModel
        buildings = self.db.query(BuildingModel).filter(
            BuildingModel.id.in_(building_ids)
        ).all()
        user.assigned_buildings = buildings
        self.db.commit()
    
    def search_users(
        self,
        query: str,
        complex_id: Optional[int] = None,
        role: Optional[UserRole] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[UserModel]:
        """Search users by username, email, or unit_number."""
        q = self.db.query(UserModel).filter(UserModel.is_active == True)
        
        # Apply search filter
        search_term = f"%{query}%"
        q = q.filter(
            (UserModel.username.ilike(search_term)) |
            (UserModel.email.ilike(search_term)) |
            (UserModel.unit_number.ilike(search_term)) |
            (UserModel.contact.ilike(search_term))
        )
        
        # Filter by complex if provided
        if complex_id:
            from app.models.models import ResidentialComplexModel
            q = q.join(UserModel.assigned_complexes).filter(
                ResidentialComplexModel.id == complex_id
            )
        
        # Filter by role if provided
        if role:
            q = q.filter(UserModel.role == role)
        
        return q.offset(skip).limit(limit).all()
