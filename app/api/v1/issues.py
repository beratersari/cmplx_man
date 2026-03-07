from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import UserModel
from app.core.entities import UserRole
from app.api.deps import get_current_user, RoleChecker
from app.services import IssueService
from .schemas import IssueCreate, IssueOut, IssueUpdate, AdminIssueCreate

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
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List issues."""
    service = IssueService(db)
    return service.list_issues(current_user, complex_id, skip, limit)


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
