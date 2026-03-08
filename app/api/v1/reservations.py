from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import UserModel
from app.core.entities import UserRole
from app.api.deps import get_current_user, RoleChecker
from app.services import ReservationService
from .schemas import (
    ReservationCreate,
    AdminReservationCreate,
    ReservationUpdate,
    ReservationStatusUpdate,
    ReservationOverlapStats,
    ReservationOverlapStatsById,
    ReservationOut
)

router = APIRouter()


@router.get("/overlap-stats", response_model=ReservationOverlapStats, summary="Get Overlap Stats", description="Get statistics about other accepted reservations that overlap with the given time interval.")
def get_overlap_stats(
    category_id: int = Query(..., gt=0),
    date: datetime = Query(...),
    start_hour: str = Query(..., pattern="^([01]?[0-9]|2[0-3]):([0-5][0-9])$"),
    end_hour: str = Query(..., pattern="^([01]?[0-9]|2[0-3]):([0-5][0-9])$"),
    exclude_reservation_id: Optional[int] = Query(None, gt=0),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get overlap stats for a potential or existing reservation."""
    service = ReservationService(db)
    return service.get_overlapping_stats(
        category_id, date, start_hour, end_hour, current_user, exclude_reservation_id
    )


# Reservation Endpoints
@router.post("/", response_model=ReservationOut, summary="Create Reservation", description="Creates a new reservation for the current user. Users can make reservations in their assigned complex. Status is set to PENDING by default.")
def create_reservation(
    reservation_in: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Create a new reservation for the current user.
    The user must be assigned to a complex.
    Reservation will be created with PENDING status.
    """
    service = ReservationService(db)
    return service.create_reservation(reservation_in, current_user)


@router.post("/admin", response_model=ReservationOut, summary="Admin: Create Reservation", description="Creates a reservation for any user in any complex. Restricted to Admins only.")
def admin_create_reservation(
    reservation_in: AdminReservationCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """
    Admin endpoint to create a reservation for any user in any complex.
    """
    service = ReservationService(db)
    return service.admin_create_reservation(reservation_in, current_user)


@router.get("/my", response_model=List[ReservationOut], summary="Get My Reservations", description="Get all reservations for the current user.")
def get_my_reservations(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get all reservations for the current user."""
    service = ReservationService(db)
    return service.list_reservations(current_user, None, None, None, 0, 100)


@router.get("/{reservation_id}/overlap-stats", response_model=ReservationOverlapStatsById, summary="Get Overlap Stats by Reservation ID", description="Get statistics about other accepted reservations that overlap with a specific reservation.")
def get_overlap_stats_by_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get overlap stats for a specific reservation by its ID.
    
    Returns the count of other accepted reservations that overlap with this reservation,
    along with the total number of people from those overlapping reservations.
    """
    service = ReservationService(db)
    return service.get_overlapping_stats_by_reservation_id(reservation_id, current_user)


@router.get("/", response_model=List[ReservationOut], summary="List Reservations", description="Lists reservations. Admins see all, managers/attendants see their complex, residents see their own reservations. Can filter by complex_id, date, and status.")
def list_reservations(
    complex_id: Optional[int] = None,
    date: Optional[datetime] = None,
    status: Optional[str] = Query(None, pattern="^(PENDING|ACCEPTED|REJECTED)$"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List reservations based on user role."""
    service = ReservationService(db)
    return service.list_reservations(current_user, complex_id, date, status, skip, limit)


@router.get("/{reservation_id}", response_model=ReservationOut, summary="Get Reservation", description="Get a specific reservation by ID. Authorized for owner, admin, manager, and staff.")
def get_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get a specific reservation by ID."""
    service = ReservationService(db)
    return service.get_reservation_by_id(reservation_id, current_user)


@router.put("/{reservation_id}", response_model=ReservationOut, summary="Update Reservation", description="Update a reservation. Users can update their own reservations. Admins and managers can update reservations in their complex.")
def update_reservation(
    reservation_id: int,
    reservation_in: ReservationUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Update a reservation."""
    service = ReservationService(db)
    return service.update_reservation(reservation_id, reservation_in, current_user)


@router.put("/{reservation_id}/status", response_model=ReservationOut, summary="Update Reservation Status", description="Update reservation status (ACCEPTED/REJECTED). Admin, managers, and staff only.")
def update_reservation_status(
    reservation_id: int,
    status_in: ReservationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Update reservation status (PENDING, ACCEPTED, REJECTED).
    Only admin, managers, and staff can update status.
    Tracks who and when the status was updated.
    """
    service = ReservationService(db)
    return service.update_reservation_status(reservation_id, status_in, current_user)


@router.delete("/{reservation_id}", summary="Cancel Reservation", description="Cancel a reservation. Users can cancel their own reservations. Admins and managers can cancel reservations in their complex.")
def cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Cancel (delete) a reservation."""
    service = ReservationService(db)
    return service.cancel_reservation(reservation_id, current_user)
