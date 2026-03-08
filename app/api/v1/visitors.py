from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import UserModel
from app.services import VisitorService
from app.api.deps import get_current_user, RoleChecker
from app.core.entities import UserRole
from app.api.v1.schemas import VisitorCreate, VisitorUpdate, VisitorOut, VisitorCountByBuilding, VisitorCountByUser, VisitorStatusUpdate

router = APIRouter()


@router.post("/", response_model=VisitorOut, summary="Register Visitor", description="Register a visitor for the authenticated user's complex.")
def create_visitor(
    visitor_in: VisitorCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Register a visitor."""
    service = VisitorService(db)
    return service.create_visitor(visitor_in, current_user)


@router.get("/", response_model=List[VisitorOut], summary="List Visitors", description="Visitors see their own visitors from the last 7 days. Managers/attendants see all visitors from their complex for the last 7 days.")
def list_recent_visitors(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """List recent visitors based on role."""
    service = VisitorService(db)
    if current_user.role in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
        return service.list_visitors_for_staff(current_user)
    return service.list_visitors_for_user(current_user)


@router.get("/manager", response_model=List[VisitorOut], summary="List Visitors by Date (Manager)", description="Managers can view visitors for a specific date using the visit_date parameter.")
def list_visitors_for_manager(
    visit_date: date = Query(..., description="Date to filter visitors (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.SITE_MANAGER])),
):
    """List visitors for a specific date (manager-only)."""
    service = VisitorService(db)
    return service.list_visitors_for_manager(current_user, visit_date)


@router.put("/{visitor_id}", response_model=VisitorOut, summary="Update Visitor", description="Update a visitor (creator, admin, or manager of same complex).")
def update_visitor(
    visitor_id: int,
    visitor_in: VisitorUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Update a visitor."""
    service = VisitorService(db)
    return service.update_visitor(visitor_id, visitor_in, current_user)


@router.put("/{visitor_id}/status", response_model=VisitorOut, summary="Update Visitor Status", description="Update visitor entry status (staff only: admin, manager, or attendant).")
def update_visitor_status(
    visitor_id: int,
    status_in: VisitorStatusUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Update visitor status (staff only)."""
    service = VisitorService(db)
    return service.update_visitor_status(visitor_id, status_in, current_user)


@router.delete("/{visitor_id}", summary="Delete Visitor", description="Delete a visitor (creator, admin, or manager of same complex).")
def delete_visitor(
    visitor_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Delete a visitor."""
    service = VisitorService(db)
    return service.delete_visitor(visitor_id, current_user)


# Admin endpoints
@router.get("/admin/list", response_model=List[VisitorOut], summary="Admin: List Visitors", description="Admin can list visitors for any complex. Optional date filter.")
def admin_list_visitors(
    complex_id: int,
    visit_date: Optional[date] = Query(None, description="Optional date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """List visitors for any complex (admin only)."""
    service = VisitorService(db)
    return service.admin_list_visitors(complex_id, visit_date)


@router.put("/admin/{visitor_id}", response_model=VisitorOut, summary="Admin: Update Visitor", description="Admin can update any visitor.")
def admin_update_visitor(
    visitor_id: int,
    visitor_in: VisitorUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """Update any visitor (admin only)."""
    service = VisitorService(db)
    return service.admin_update_visitor(visitor_id, visitor_in, current_user)


@router.delete("/admin/{visitor_id}", summary="Admin: Delete Visitor", description="Admin can delete any visitor.")
def admin_delete_visitor(
    visitor_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """Delete any visitor (admin only)."""
    service = VisitorService(db)
    return service.admin_delete_visitor(visitor_id)


# Stats endpoints
@router.get("/stats/by-building", response_model=List[VisitorCountByBuilding], summary="Visitor Counts by Building (Manager)", description="Get visitor counts grouped by building for manager's complex.")
def get_visitor_counts_by_building_manager(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.SITE_MANAGER])),
):
    """Get visitor counts by building for manager."""
    service = VisitorService(db)
    return service.get_visitor_counts_by_building_for_manager(current_user)


@router.get("/stats/by-building/admin", response_model=List[VisitorCountByBuilding], summary="Visitor Counts by Building (Admin)", description="Get visitor counts grouped by building for a specific complex (admin only).")
def get_visitor_counts_by_building_admin(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """Get visitor counts by building for admin."""
    service = VisitorService(db)
    return service.get_visitor_counts_by_building_for_admin(complex_id)


@router.get("/stats/by-user", response_model=List[VisitorCountByUser], summary="Visitor Counts by User (Manager)", description="Get visitor counts grouped by username for manager's complex.")
def get_visitor_counts_by_user_manager(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.SITE_MANAGER])),
):
    """Get visitor counts by user for manager."""
    service = VisitorService(db)
    return service.get_visitor_counts_by_user_for_manager(current_user)


@router.get("/stats/by-user/admin", response_model=List[VisitorCountByUser], summary="Visitor Counts by User (Admin)", description="Get visitor counts grouped by username for a specific complex (admin only).")
def get_visitor_counts_by_user_admin(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """Get visitor counts by user for admin."""
    service = VisitorService(db)
    return service.get_visitor_counts_by_user_for_admin(complex_id)
