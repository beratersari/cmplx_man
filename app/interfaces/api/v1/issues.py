from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.infrastructure.models import IssueModel, ResidentialComplexModel, UserModel, IssueImageModel
from app.domain.entities import UserRole, IssueStatus
from app.interfaces.api.deps import get_current_user, RoleChecker
from app.infrastructure.logging_config import logger
from .schemas import IssueCreate, IssueOut, IssueUpdate, AdminIssueCreate

router = APIRouter()

# Access: Any resident, manager, or attendant assigned to a complex.
@router.post("/", response_model=IssueOut, summary="Report Issue/Request", description="Creates a new issue or request. The complex ID is automatically extracted from the user's assignment. Users not assigned to a complex cannot use this API.")
def create_issue(
    issue_in: IssueCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) reporting issue")
    
    if current_user.assigned_complexes:
        # Use the first assigned complex (users are constrained to at most one complex)
        complex_obj = current_user.assigned_complexes[0]
    elif current_user.assigned_buildings:
        # Residents may be assigned via buildings; infer complex from building
        complex_obj = current_user.assigned_buildings[0].complex
    else:
        logger.warning(f"Issue report failed: User {current_user.username} is not assigned to any complex")
        raise HTTPException(status_code=403, detail="You must be assigned to a complex to report issues")

    new_issue = IssueModel(
        title=issue_in.title,
        description=issue_in.description,
        complex_id=complex_obj.id,
        user_id=current_user.id,
        created_by=current_user.id
    )
    db.add(new_issue)
    db.flush()

    for path in issue_in.img_paths:
        img = IssueImageModel(issue_id=new_issue.id, img_path=path)
        db.add(img)

    db.commit()
    db.refresh(new_issue)
    logger.info(f"Issue reported successfully: ID {new_issue.id} for complex ID {complex_obj.id}")
    return new_issue

# Access: Admins only.
@router.post("/admin", response_model=IssueOut, summary="Admin Create Issue", description="Allows admins to create an issue for a specific complex. Restricted to Admins only.")
def admin_create_issue(
    issue_in: AdminIssueCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    logger.info(f"Admin {current_user.username} (ID: {current_user.id}) creating issue for complex ID {issue_in.complex_id}")
    
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == issue_in.complex_id).first()
    if not complex_obj:
        raise HTTPException(status_code=404, detail="Complex not found")

    new_issue = IssueModel(
        title=issue_in.title,
        description=issue_in.description,
        complex_id=issue_in.complex_id,
        user_id=current_user.id,
        created_by=current_user.id
    )
    db.add(new_issue)
    db.flush()

    for path in issue_in.img_paths:
        img = IssueImageModel(issue_id=new_issue.id, img_path=path)
        db.add(img)

    db.commit()
    db.refresh(new_issue)
    return new_issue

# Access: Managers and attendants assigned to the complex, or the reporter.
@router.get("/", response_model=List[IssueOut], summary="List Issues", description="Retrieves a list of issues. Managers and attendants see all issues in their complexes. Residents see only their own reported issues.")
def read_issues(
    complex_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching issues")
    query = db.query(IssueModel)
    
    if complex_id:
        query = query.filter(IssueModel.complex_id == complex_id)

    if current_user.role == UserRole.ADMIN:
        return query.offset(skip).limit(limit).all()
    
    # Filter by user's assigned complexes
    assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
    
    if current_user.role in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
        # See all issues in their complexes
        return query.filter(IssueModel.complex_id.in_(assigned_complex_ids)).offset(skip).limit(limit).all()
    else:
        # Residents see only their own
        return query.filter(IssueModel.user_id == current_user.id).offset(skip).limit(limit).all()

# Access: Admins, Managers, and Attendants assigned to the complex.
@router.put("/{issue_id}", response_model=IssueOut, summary="Update Issue Status", description="Updates an issue's status or details. Restricted to Admins, Managers, or Attendants assigned to the complex. Workflow: OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED.")
def update_issue(
    issue_id: int,
    issue_in: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) updating issue ID {issue_id}")
    issue = db.query(IssueModel).filter(IssueModel.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    # Authorization
    if current_user.role != UserRole.ADMIN:
        if issue.complex not in current_user.assigned_complexes:
            logger.warning(f"Unauthorized update attempt on issue ID {issue_id} by {current_user.username}")
            raise HTTPException(status_code=403, detail="Not enough permissions for this complex")
        if current_user.role not in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
             logger.warning(f"Unauthorized update attempt on issue ID {issue_id} by {current_user.username} (not staff)")
             raise HTTPException(status_code=403, detail="Only staff (Managers/Attendants) can update issue status")

    if issue_in.title:
        issue.title = issue_in.title
    if issue_in.description:
        issue.description = issue_in.description
    if issue_in.status:
        logger.info(f"Issue ID {issue_id} status changing from {issue.status} to {issue_in.status} by {current_user.username}")
        issue.status = issue_in.status
    
    issue.updated_by = current_user.id
    db.commit()
    db.refresh(issue)
    logger.info(f"Issue ID {issue_id} updated successfully")
    return issue
