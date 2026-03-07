from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.models import VehicleModel
from .base_repository import BaseRepository


class VehicleRepository(BaseRepository[VehicleModel]):
    """Repository for Vehicle entity operations."""
    
    def __init__(self, db: Session):
        super().__init__(db, VehicleModel)
    
    def get_by_plate(self, plate_number: str) -> Optional[VehicleModel]:
        """Get vehicle by plate number."""
        return self.db.query(VehicleModel).filter(
            VehicleModel.plate_number == plate_number
        ).first()
    
    def plate_exists(self, plate_number: str, exclude_id: Optional[int] = None) -> bool:
        """Check if plate number already exists."""
        query = self.db.query(VehicleModel).filter(
            VehicleModel.plate_number == plate_number
        )
        if exclude_id:
            query = query.filter(VehicleModel.id != exclude_id)
        return query.first() is not None
    
    def get_vehicles_by_user(
        self, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[VehicleModel]:
        """Get all vehicles for a specific user."""
        return self.db.query(VehicleModel).filter(
            VehicleModel.user_id == user_id
        ).offset(skip).limit(limit).all()
    
    def get_vehicles_for_complex_residents(
        self, 
        complex_ids: List[int], 
        skip: int = 0, 
        limit: int = 50
    ) -> List[VehicleModel]:
        """Get vehicles for residents in specified complexes."""
        from app.models.models import BuildingModel
        from sqlalchemy import exists
        
        return self.db.query(VehicleModel).join(
            VehicleModel.user
        ).filter(
            VehicleModel.user.has(
                exists().where(BuildingModel.complex_id.in_(complex_ids))
            )
        ).offset(skip).limit(limit).all()
