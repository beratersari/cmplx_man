from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import (
    ReservationRepository, 
    ReservationCategoryRepository, 
    ComplexRepository
)
from app.models.models import UserModel, ReservationModel
from app.core.entities import UserRole, ReservationStatus
from app.api.v1.schemas import (
    ReservationCreate, 
    AdminReservationCreate, 
    ReservationUpdate,
    ReservationStatusUpdate
)
from app.core.logging_config import logger


class ReservationService:
    """Service for reservation-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.reservation_repo = ReservationRepository(db)
        self.category_repo = ReservationCategoryRepository(db)
        self.complex_repo = ComplexRepository(db)
    
    def create_reservation(
        self,
        reservation_in: ReservationCreate,
        current_user: UserModel
    ) -> ReservationModel:
        """Create a reservation for the current user."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) creating reservation")
        
        # Get user's complex
        if not current_user.assigned_complexes:
            raise HTTPException(status_code=400, detail="You are not assigned to any complex")
        
        user_complex = current_user.assigned_complexes[0]
        
        # Verify category belongs to user's complex
        category = self.category_repo.get_by_id(reservation_in.category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Reservation category not found")
        
        if category.complex_id != user_complex.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Validate time: start_hour must be before end_hour
        if reservation_in.start_hour >= reservation_in.end_hour:
            raise HTTPException(status_code=400, detail="Start hour must be before end hour")
        
        reservation_data = {
            "category_id": reservation_in.category_id,
            "user_id": current_user.id,
            "complex_id": user_complex.id,
            "reservation_date": reservation_in.reservation_date,
            "start_hour": reservation_in.start_hour,
            "end_hour": reservation_in.end_hour,
            "person_count": reservation_in.person_count,
            "notes": reservation_in.notes,
            "status": ReservationStatus.PENDING,
        }
        
        new_reservation = self.reservation_repo.create(reservation_data, created_by=current_user.id)
        logger.info(f"Reservation created successfully: ID {new_reservation.id}")
        return new_reservation
    
    def admin_create_reservation(
        self,
        reservation_in: AdminReservationCreate,
        current_user: UserModel
    ) -> ReservationModel:
        """Admin endpoint to create a reservation for any user in any complex."""
        logger.info(f"Admin {current_user.username} (ID: {current_user.id}) creating reservation")
        
        # Verify complex exists
        complex_obj = self.complex_repo.get_by_id(reservation_in.complex_id)
        if not complex_obj:
            raise HTTPException(status_code=404, detail="Residential complex not found")
        
        # Verify category
        category = self.category_repo.get_by_id(reservation_in.category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Reservation category not found")
        
        if category.complex_id != reservation_in.complex_id:
            raise HTTPException(status_code=400, detail="Category does not belong to the specified complex")
        
        # Validate time
        if reservation_in.start_hour >= reservation_in.end_hour:
            raise HTTPException(status_code=400, detail="Start hour must be before end hour")
        
        reservation_data = {
            "category_id": reservation_in.category_id,
            "user_id": reservation_in.user_id,
            "complex_id": reservation_in.complex_id,
            "reservation_date": reservation_in.reservation_date,
            "start_hour": reservation_in.start_hour,
            "end_hour": reservation_in.end_hour,
            "person_count": reservation_in.person_count,
            "notes": reservation_in.notes,
            "status": ReservationStatus.PENDING,
        }
        
        new_reservation = self.reservation_repo.create(reservation_data, created_by=current_user.id)
        logger.info(f"Reservation created successfully: ID {new_reservation.id}")
        return new_reservation
    
    def list_reservations(
        self,
        current_user: UserModel,
        complex_id: int = None,
        date: datetime = None,
        status: str = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[ReservationModel]:
        """List reservations based on user role."""
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching reservations")
        
        if current_user.role == UserRole.ADMIN:
            target_complex_id = complex_id
            if target_complex_id:
                if status:
                    return self.reservation_repo.get_reservations_by_status(
                        target_complex_id, ReservationStatus(status), skip, limit
                    )
                if date:
                    return self.reservation_repo.get_reservations_by_date(target_complex_id, date, skip, limit)
                return self.reservation_repo.get_reservations_by_complex(target_complex_id, skip, limit)
            return self.reservation_repo.get_all(skip, limit)
        
        if current_user.role in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            if not current_user.assigned_complexes:
                return []
            manager_complex = current_user.assigned_complexes[0]
            if status:
                return self.reservation_repo.get_reservations_by_status(
                    manager_complex.id, ReservationStatus(status), skip, limit
                )
            if date:
                return self.reservation_repo.get_reservations_by_date(manager_complex.id, date, skip, limit)
            return self.reservation_repo.get_reservations_by_complex(manager_complex.id, skip, limit)
        
        # Residents see their own reservations
        return self.reservation_repo.get_reservations_by_user(current_user.id, skip, limit)
    
    def get_reservation_by_id(self, reservation_id: int, current_user: UserModel) -> ReservationModel:
        """Get reservation by ID or raise exception. Enforces permission checks."""
        reservation = self.reservation_repo.get_by_id(reservation_id)
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        
        # Check permissions
        self._validate_view_permission(current_user, reservation)
        
        return reservation

    def get_overlapping_stats(
        self,
        category_id: int,
        date: datetime,
        start_hour: str,
        end_hour: str,
        current_user: UserModel,
        exclude_reservation_id: Optional[int] = None
    ) -> dict:
        """Get statistics about overlapping reservations."""
        # Check complex access
        category = self.category_repo.get_by_id(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Reservation category not found")
        
        self._validate_access(current_user, category.complex_id)
        
        overlapping = self.reservation_repo.get_overlapping_reservations(
            category_id, date, start_hour, end_hour, exclude_reservation_id
        )
        
        total_people = sum(r.person_count for r in overlapping)
        
        return {
            "other_reservations_count": len(overlapping),
            "total_people_count": total_people
        }

    def get_overlapping_stats_by_reservation_id(
        self,
        reservation_id: int,
        current_user: UserModel
    ) -> dict:
        """Get statistics about overlapping accepted reservations for a specific reservation."""
        # Get the reservation
        reservation = self.reservation_repo.get_by_id(reservation_id)
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        
        # Check view permission
        self._validate_view_permission(current_user, reservation)
        
        # Get overlapping accepted reservations (excluding the current one)
        overlapping = self.reservation_repo.get_overlapping_accepted_reservations(
            reservation.category_id,
            reservation.reservation_date,
            reservation.start_hour,
            reservation.end_hour,
            exclude_reservation_id=reservation_id
        )
        
        total_people = sum(r.person_count for r in overlapping)
        
        return {
            "reservation_id": reservation_id,
            "other_accepted_reservations_count": len(overlapping),
            "total_people_count": total_people
        }

    def update_reservation(
        self,
        reservation_id: int,
        reservation_in: ReservationUpdate,
        current_user: UserModel
    ) -> ReservationModel:
        """Update a reservation (owner or admin/manager)."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) updating reservation ID {reservation_id}")
        
        reservation = self.reservation_repo.get_by_id(reservation_id)
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        
        # Validate access
        self._validate_modify_permission(current_user, reservation)
        
        # If changing category, verify it belongs to the same complex
        if reservation_in.category_id:
            category = self.category_repo.get_by_id(reservation_in.category_id)
            if not category:
                raise HTTPException(status_code=404, detail="Reservation category not found")
            if category.complex_id != reservation.complex_id:
                raise HTTPException(status_code=400, detail="Category does not belong to the reservation's complex")
        
        # Validate time if provided
        start_hour = reservation_in.start_hour or reservation.start_hour
        end_hour = reservation_in.end_hour or reservation.end_hour
        if start_hour >= end_hour:
            raise HTTPException(status_code=400, detail="Start hour must be before end hour")
        
        update_data = {}
        if reservation_in.category_id:
            update_data["category_id"] = reservation_in.category_id
        if reservation_in.reservation_date:
            update_data["reservation_date"] = reservation_in.reservation_date
        if reservation_in.start_hour:
            update_data["start_hour"] = reservation_in.start_hour
        if reservation_in.end_hour:
            update_data["end_hour"] = reservation_in.end_hour
        if reservation_in.person_count is not None:
            update_data["person_count"] = reservation_in.person_count
        if reservation_in.notes is not None:
            update_data["notes"] = reservation_in.notes
        
        reservation = self.reservation_repo.update(reservation, update_data, updated_by=current_user.id)
        logger.info(f"Reservation ID {reservation_id} updated successfully")
        return reservation
    
    def update_reservation_status(
        self,
        reservation_id: int,
        status_in: ReservationStatusUpdate,
        current_user: UserModel
    ) -> ReservationModel:
        """Update reservation status (admin/manager/staff only)."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) updating status for reservation ID {reservation_id}")
        
        # Only admin, manager, and attendant can update status
        if current_user.role not in [UserRole.ADMIN, UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            raise HTTPException(status_code=403, detail="Only admin, managers, and staff can update reservation status")
        
        reservation = self.reservation_repo.get_by_id(reservation_id)
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        
        # Validate access for non-admin users
        if current_user.role != UserRole.ADMIN:
            if not current_user.assigned_complexes:
                raise HTTPException(status_code=403, detail="You are not assigned to any complex")
            user_complex_ids = [c.id for c in current_user.assigned_complexes]
            if reservation.complex_id not in user_complex_ids:
                raise HTTPException(status_code=403, detail="Not enough permissions")
        
        new_status = ReservationStatus(status_in.status)
        
        update_data = {
            "status": new_status,
            "status_updated_by": current_user.id,
            "status_updated_date": datetime.utcnow()
        }
        
        reservation = self.reservation_repo.update(reservation, update_data, updated_by=current_user.id)
        logger.info(f"Reservation ID {reservation_id} status updated to {new_status}")
        return reservation
    
    def cancel_reservation(self, reservation_id: int, current_user: UserModel) -> dict:
        """Cancel (delete) a reservation."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) cancelling reservation ID {reservation_id}")
        
        reservation = self.reservation_repo.get_by_id(reservation_id)
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")
        
        # Validate access
        self._validate_modify_permission(current_user, reservation)
        
        self.reservation_repo.delete(reservation)
        logger.info(f"Reservation ID {reservation_id} cancelled successfully")
        return {"message": "Reservation cancelled successfully"}
    
    def _validate_view_permission(self, current_user: UserModel, reservation: ReservationModel):
        """Validate that user can view the reservation."""
        # Owner can view
        if reservation.user_id == current_user.id:
            return
        
        # Admin can view anything
        if current_user.role == UserRole.ADMIN:
            return
        
        # Manager/Attendant can view reservations in their complex
        if current_user.role in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            if current_user.assigned_complexes:
                user_complex_ids = [c.id for c in current_user.assigned_complexes]
                if reservation.complex_id in user_complex_ids:
                    return
        
        raise HTTPException(status_code=403, detail="Not enough permissions to view this reservation")

    def _validate_access(self, current_user: UserModel, complex_id: int):
        """Validate that user has access to the complex."""
        # Admin can access anything
        if current_user.role == UserRole.ADMIN:
            return
        
        # Manager/Attendant/Resident can access their own complex
        if current_user.assigned_complexes:
            user_complex_ids = [c.id for c in current_user.assigned_complexes]
            if complex_id in user_complex_ids:
                return
        
        raise HTTPException(status_code=403, detail="Not enough permissions to access this complex")

    def _validate_modify_permission(self, current_user: UserModel, reservation: ReservationModel):
        """Validate that user can modify the reservation."""
        # Owner can modify
        if reservation.user_id == current_user.id:
            return
        
        # Admin can modify anything
        if current_user.role == UserRole.ADMIN:
            return
        
        # Manager/Attendant can modify reservations in their complex
        if current_user.role in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            if current_user.assigned_complexes:
                user_complex_ids = [c.id for c in current_user.assigned_complexes]
                if reservation.complex_id in user_complex_ids:
                    return
        
        raise HTTPException(status_code=403, detail="Not enough permissions to modify this reservation")
