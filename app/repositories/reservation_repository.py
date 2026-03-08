from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import ReservationModel
from app.core.entities import ReservationStatus
from .base_repository import BaseRepository


class ReservationRepository(BaseRepository[ReservationModel]):
    """Repository for Reservation entity operations."""
    
    def __init__(self, db: Session):
        super().__init__(db, ReservationModel)
    
    def get_reservations_by_user(
        self, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[ReservationModel]:
        """Get all reservations for a user."""
        return self.db.query(ReservationModel).filter(
            ReservationModel.user_id == user_id
        ).order_by(ReservationModel.reservation_date.desc()).offset(skip).limit(limit).all()
    
    def get_reservations_by_complex(
        self, 
        complex_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[ReservationModel]:
        """Get all reservations for a complex."""
        return self.db.query(ReservationModel).filter(
            ReservationModel.complex_id == complex_id
        ).order_by(ReservationModel.reservation_date.desc()).offset(skip).limit(limit).all()
    
    def get_reservations_by_date(
        self,
        complex_id: int,
        date: datetime,
        skip: int = 0,
        limit: int = 50
    ) -> List[ReservationModel]:
        """Get all reservations for a specific date in a complex."""
        start_of_day = datetime(date.year, date.month, date.day, 0, 0, 0)
        end_of_day = datetime(date.year, date.month, date.day, 23, 59, 59)
        return self.db.query(ReservationModel).filter(
            ReservationModel.complex_id == complex_id,
            ReservationModel.reservation_date >= start_of_day,
            ReservationModel.reservation_date <= end_of_day
        ).order_by(ReservationModel.reservation_date).offset(skip).limit(limit).all()
    
    def get_reservations_by_status(
        self,
        complex_id: int,
        status: ReservationStatus,
        skip: int = 0,
        limit: int = 50
    ) -> List[ReservationModel]:
        """Get all reservations with a specific status in a complex."""
        return self.db.query(ReservationModel).filter(
            ReservationModel.complex_id == complex_id,
            ReservationModel.status == status
        ).order_by(ReservationModel.reservation_date.desc()).offset(skip).limit(limit).all()
    
    def get_pending_reservations(
        self,
        complex_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> List[ReservationModel]:
        """Get all pending reservations in a complex."""
        return self.get_reservations_by_status(complex_id, ReservationStatus.PENDING, skip, limit)

    def get_overlapping_reservations(
        self,
        category_id: int,
        date: datetime,
        start_hour: str,
        end_hour: str,
        exclude_reservation_id: Optional[int] = None
    ) -> List[ReservationModel]:
        """Get all reservations that overlap with the given time interval."""
        start_of_day = datetime(date.year, date.month, date.day, 0, 0, 0)
        end_of_day = datetime(date.year, date.month, date.day, 23, 59, 59)
        
        query = self.db.query(ReservationModel).filter(
            ReservationModel.category_id == category_id,
            ReservationModel.reservation_date >= start_of_day,
            ReservationModel.reservation_date <= end_of_day,
            ReservationModel.status == ReservationStatus.ACCEPTED,
            ReservationModel.start_hour < end_hour,
            ReservationModel.end_hour > start_hour
        )
        
        if exclude_reservation_id:
            query = query.filter(ReservationModel.id != exclude_reservation_id)
            
        return query.all()

    def get_overlapping_accepted_reservations(
        self,
        category_id: int,
        date: datetime,
        start_hour: str,
        end_hour: str,
        exclude_reservation_id: Optional[int] = None
    ) -> List[ReservationModel]:
        """Get all ACCEPTED reservations that overlap with the given time interval.
        
        This is an alias for get_overlapping_reservations for clarity.
        Only returns reservations with ACCEPTED status.
        """
        return self.get_overlapping_reservations(
            category_id, date, start_hour, end_hour, exclude_reservation_id
        )
