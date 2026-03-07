from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.models import ResidentialComplexModel
from .base_repository import BaseRepository


class ComplexRepository(BaseRepository[ResidentialComplexModel]):
    """Repository for ResidentialComplex entity operations."""
    
    def __init__(self, db: Session):
        super().__init__(db, ResidentialComplexModel)
    
    def get_by_name(self, name: str) -> Optional[ResidentialComplexModel]:
        """Get complex by name."""
        return self.db.query(ResidentialComplexModel).filter(
            ResidentialComplexModel.name == name
        ).first()
    
    def name_exists(self, name: str, exclude_id: Optional[int] = None) -> bool:
        """Check if complex name already exists."""
        query = self.db.query(ResidentialComplexModel).filter(
            ResidentialComplexModel.name == name
        )
        if exclude_id:
            query = query.filter(ResidentialComplexModel.id != exclude_id)
        return query.first() is not None
    
    def get_complexes_for_user(
        self, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[ResidentialComplexModel]:
        """Get all complexes assigned to a user."""
        from app.models.models import UserModel
        user = self.db.query(UserModel).filter(UserModel.id == user_id).first()
        if user:
            return user.assigned_complexes[skip:skip + limit]
        return []
    
    def get_all_active(self, skip: int = 0, limit: int = 50) -> List[ResidentialComplexModel]:
        """Get all active complexes."""
        return self.db.query(ResidentialComplexModel).filter(
            ResidentialComplexModel.is_active == True
        ).offset(skip).limit(limit).all()
