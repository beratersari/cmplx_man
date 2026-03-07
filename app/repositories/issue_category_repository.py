from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.models import IssueCategoryModel
from .base_repository import BaseRepository


class IssueCategoryRepository(BaseRepository[IssueCategoryModel]):
    """Repository for Issue Category entity operations."""
    
    def __init__(self, db: Session):
        super().__init__(db, IssueCategoryModel)
    
    def get_by_name_in_complex(
        self, 
        name: str, 
        complex_id: int,
        exclude_id: Optional[int] = None
    ) -> Optional[IssueCategoryModel]:
        """Get category by name within a complex."""
        query = self.db.query(IssueCategoryModel).filter(
            IssueCategoryModel.name == name,
            IssueCategoryModel.complex_id == complex_id
        )
        if exclude_id:
            query = query.filter(IssueCategoryModel.id != exclude_id)
        return query.first()
    
    def get_categories_by_complex(
        self, 
        complex_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[IssueCategoryModel]:
        """Get all categories in a complex."""
        return self.db.query(IssueCategoryModel).filter(
            IssueCategoryModel.complex_id == complex_id
        ).offset(skip).limit(limit).all()
    
    def category_exists_in_complex(
        self, 
        name: str, 
        complex_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if category name exists in complex."""
        return self.get_by_name_in_complex(name, complex_id, exclude_id) is not None
