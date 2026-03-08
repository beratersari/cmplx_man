from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.models import BuildingModel
from .base_repository import BaseRepository


class BuildingRepository(BaseRepository[BuildingModel]):
    """Repository for Building entity operations."""
    
    def __init__(self, db: Session):
        super().__init__(db, BuildingModel)
    
    def get_by_name_in_complex(
        self, 
        name: str, 
        complex_id: int,
        exclude_id: Optional[int] = None
    ) -> Optional[BuildingModel]:
        """Get building by name within a complex."""
        query = self.db.query(BuildingModel).filter(
            BuildingModel.name == name,
            BuildingModel.complex_id == complex_id
        )
        if exclude_id:
            query = query.filter(BuildingModel.id != exclude_id)
        return query.first()
    
    def get_buildings_by_complex(
        self, 
        complex_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[BuildingModel]:
        """Get all buildings in a complex."""
        return self.get_by_complex(complex_id, skip, limit)
    
    def get_by_complex(
        self, 
        complex_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[BuildingModel]:
        """Get all buildings in a complex."""
        return self.db.query(BuildingModel).filter(
            BuildingModel.complex_id == complex_id
        ).offset(skip).limit(limit).all()
    
    def get_buildings_for_user_complexes(
        self, 
        complex_ids: List[int], 
        skip: int = 0, 
        limit: int = 50
    ) -> List[BuildingModel]:
        """Get all buildings in specified complexes."""
        return self.db.query(BuildingModel).filter(
            BuildingModel.complex_id.in_(complex_ids)
        ).offset(skip).limit(limit).all()
    
    def building_exists_in_complex(
        self, 
        name: str, 
        complex_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if building name exists in complex."""
        return self.get_by_name_in_complex(name, complex_id, exclude_id) is not None
    
    def get_users_in_building(
        self, 
        building_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List:
        """Get all users in a building."""
        from app.models.models import UserModel, ResidentialComplexModel
        building = self.get_by_id(building_id)
        if not building:
            return []
        
        # Residents in the building
        residents = building.residents
        
        # Management users assigned to the building's complex
        management_users = self.db.query(UserModel).join(
            UserModel.assigned_complexes
        ).filter(
            ResidentialComplexModel.id == building.complex_id
        ).distinct().all()
        
        # Combine and deduplicate
        combined = {user.id: user for user in residents + management_users}
        return list(combined.values())[skip:skip + limit]
