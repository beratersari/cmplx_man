from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import UserModel
from app.core.entities import UserRole
from app.api.deps import get_current_user, RoleChecker
from app.services import IssueService
from .schemas import (
    IssueCreate,
    IssueOut,
    IssueUpdate,
    AdminIssueCreate,
    IssueStatusSummary,
    IssueDailyCount,
    IssueClosedByUser,
    IssueCountByBuilding,
    IssueCountByUser,
    IssueCountByCategory,
    IssueHeatmapPoint,
    CommentCreate,
    ReplyCreate,
    CommentOut,
)

router = APIRouter()


@router.post("/", response_model=IssueOut, summary="Report Issue/Request", description="Creates a new issue or request. The complex ID is automatically extracted from the user's assignment. Users not assigned to a complex cannot use this API.")
def create_issue(
    issue_in: IssueCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Create a new issue."""
    service = IssueService(db)
    return service.create_issue(issue_in, current_user)


@router.post("/admin", response_model=IssueOut, summary="Admin Create Issue", description="Allows admins to create an issue for a specific complex. Restricted to Admins only.")
def admin_create_issue(
    issue_in: AdminIssueCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """Create an issue for a specific complex (admin only)."""
    service = IssueService(db)
    return service.admin_create_issue(issue_in, current_user)


@router.get("/", response_model=List[IssueOut], summary="List Issues", description="Retrieves a list of issues. Managers and attendants see all issues in their complexes. Residents see only their own reported issues.")
def read_issues(
    complex_id: int = None,
    category_id: int = None,
    status: str = None,
    priority: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List issues."""
    service = IssueService(db)
    return service.list_issues(
        current_user,
        complex_id,
        skip,
        limit,
        category_id=category_id,
        status=status,
        priority=priority,
    )


@router.get("/heatmap", response_model=List[IssueHeatmapPoint], summary="Issue Heatmap", description="Get issue counts grouped by weekday and hour for the current user's complexes. Admins can specify a complex.")
def get_issue_heatmap(
    complex_id: int = None,
    category_id: int = None,
    priority: str = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get issue heatmap counts."""
    service = IssueService(db)
    if current_user.role == UserRole.ADMIN and complex_id:
        return service.get_issue_heatmap_for_admin(
            complex_id,
            category_id=category_id,
            priority=priority,
        )
    return service.get_issue_heatmap_for_user(
        current_user,
        category_id=category_id,
        priority=priority,
    )


@router.get("/{issue_id}", response_model=IssueOut, summary="Get Issue", description="Get an issue by ID.")
def get_issue_by_id(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get issue by ID."""
    service = IssueService(db)
    return service.get_issue_by_id(issue_id, current_user)


@router.put("/{issue_id}", response_model=IssueOut, summary="Update Issue Status", description="Updates an issue's status or details. Restricted to Admins, Managers, or Attendants assigned to the complex. Workflow: OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED.")
def update_issue(
    issue_id: int,
    issue_in: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Update an issue."""
    service = IssueService(db)
    return service.update_issue(issue_id, issue_in, current_user)


@router.get("/{issue_id}/comments", response_model=List[CommentOut], summary="Issue Comments", description="Get comments for an issue.")
def get_issue_comments(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get comments for an issue."""
    service = IssueService(db)
    return service.get_issue_comments(issue_id, current_user)


@router.post("/{issue_id}/comments", response_model=CommentOut, summary="Create Issue Comment", description="Create a top-level comment on an issue.")
def create_issue_comment(
    issue_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Create a top-level comment on an issue."""
    service = IssueService(db)
    return service.add_issue_comment(issue_id, comment_in, current_user)


@router.post("/{issue_id}/replies", response_model=CommentOut, summary="Create Issue Reply", description="Create a reply to a comment on an issue.")
def create_issue_reply(
    issue_id: int,
    reply_in: ReplyCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Create a reply to a comment on an issue."""
    service = IssueService(db)
    return service.add_issue_reply(issue_id, reply_in, current_user)


@router.put("/comments/{comment_id}", response_model=CommentOut, summary="Update Issue Comment", description="Update a comment on an issue.")
def update_issue_comment(
    comment_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Update a comment on an issue."""
    service = IssueService(db)
    return service.update_issue_comment(comment_id, comment_in, current_user)


@router.delete("/comments/{comment_id}", summary="Delete Issue Comment", description="Delete a comment on an issue.")
def delete_issue_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Delete a comment on an issue."""
    service = IssueService(db)
    return service.delete_issue_comment(comment_id, current_user)


@router.get("/stats/status", response_model=IssueStatusSummary, summary="Issue Status Summary (Manager)", description="Get issue counts grouped by status for the manager's complex.")
def get_issue_status_summary_manager(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get issue status summary counts for a manager."""
    service = IssueService(db)
    return service.get_issue_status_summary_for_manager(current_user)


@router.get("/stats/status/admin", response_model=IssueStatusSummary, summary="Issue Status Summary (Admin)", description="Get issue counts grouped by status for a specific complex (admin only).")
def get_issue_status_summary_admin(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """Get issue status summary counts for admins."""
    service = IssueService(db)
    return service.get_issue_status_summary_for_admin(complex_id)


@router.get("/stats/daily", response_model=List[IssueDailyCount], summary="Issue Daily Counts (Manager)", description="Get issue counts grouped by day for the manager's complex. Optional start_date, end_date filters.")
def get_issue_daily_counts_manager(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get issue counts per day for a manager."""
    service = IssueService(db)
    return service.get_issue_daily_counts_for_manager(current_user, start_date, end_date)


@router.get("/stats/daily/admin", response_model=List[IssueDailyCount], summary="Issue Daily Counts (Admin)", description="Get issue counts grouped by day for a specific complex (admin only). Optional start_date, end_date filters.")
def get_issue_daily_counts_admin(
    complex_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """Get issue counts per day for admins."""
    service = IssueService(db)
    return service.get_issue_daily_counts_for_admin(complex_id, start_date, end_date)


@router.get("/stats/closed-by-user", response_model=List[IssueClosedByUser], summary="Closed Issues by User (Manager)", description="Get closed issue counts grouped by user who updated them for the manager's complex.")
def get_closed_issues_by_user_manager(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get closed issue counts by user for a manager."""
    service = IssueService(db)
    return service.get_closed_issues_by_user_for_manager(current_user)


@router.get("/stats/closed-by-user/admin", response_model=List[IssueClosedByUser], summary="Closed Issues by User (Admin)", description="Get closed issue counts grouped by user who updated them for a specific complex (admin only).")
def get_closed_issues_by_user_admin(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """Get closed issue counts by user for admins."""
    service = IssueService(db)
    return service.get_closed_issues_by_user_for_admin(complex_id)


@router.get("/stats/by-building", response_model=List[IssueCountByBuilding], summary="Issue Counts by Building (Manager)", description="Get issue counts grouped by building for the manager's complex.")
def get_issue_counts_by_building_manager(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get issue counts by building for a manager."""
    service = IssueService(db)
    return service.get_issue_counts_by_building_for_manager(current_user)


@router.get("/stats/by-building/admin", response_model=List[IssueCountByBuilding], summary="Issue Counts by Building (Admin)", description="Get issue counts grouped by building for a specific complex (admin only).")
def get_issue_counts_by_building_admin(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """Get issue counts by building for admins."""
    service = IssueService(db)
    return service.get_issue_counts_by_building_for_admin(complex_id)


@router.get("/stats/by-user", response_model=List[IssueCountByUser], summary="Issue Counts by User (Manager)", description="Get issue counts grouped by reporting user for the manager's complex.")
def get_issue_counts_by_user_manager(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get issue counts by reporting user for a manager."""
    service = IssueService(db)
    return service.get_issue_counts_by_user_for_manager(current_user)


@router.get("/stats/by-user/admin", response_model=List[IssueCountByUser], summary="Issue Counts by User (Admin)", description="Get issue counts grouped by reporting user for a specific complex (admin only).")
def get_issue_counts_by_user_admin(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """Get issue counts by reporting user for admins."""
    service = IssueService(db)
    return service.get_issue_counts_by_user_for_admin(complex_id)


@router.get("/stats/by-category", response_model=List[IssueCountByCategory], summary="Issue Counts by Category (Manager)", description="Get issue counts grouped by category for the manager's complex.")
def get_issue_counts_by_category_manager(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Get issue counts by category for a manager."""
    service = IssueService(db)
    return service.get_issue_counts_by_category_for_manager(current_user)


@router.get("/stats/by-category/admin", response_model=List[IssueCountByCategory], summary="Issue Counts by Category (Admin)", description="Get issue counts grouped by category for a specific complex (admin only).")
def get_issue_counts_by_category_admin(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
):
    """Get issue counts by category for admins."""
    service = IssueService(db)
    return service.get_issue_counts_by_category_for_admin(complex_id)
