from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import IssueRepository, ComplexRepository
from app.models.models import UserModel, IssueModel
from app.core.entities import UserRole, IssueStatus
from app.api.v1.schemas import IssueCreate, IssueUpdate, AdminIssueCreate
from app.core.logging_config import logger


class IssueService:
    """Service for issue-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.issue_repo = IssueRepository(db)
        self.complex_repo = ComplexRepository(db)
    
    def create_issue(
        self, 
        issue_in: IssueCreate, 
        current_user: UserModel
    ) -> IssueModel:
        """Create a new issue, automatically determining complex from user context."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) reporting issue")
        
        # Determine complex from user's assignment
        complex_obj = self._get_user_complex(current_user)
        if not complex_obj:
            logger.warning(f"Issue report failed: User {current_user.username} is not assigned to any complex")
            raise HTTPException(status_code=403, detail="You must be assigned to a complex to report issues")
        
        issue_data = {
            "title": issue_in.title,
            "description": issue_in.description,
            "complex_id": complex_obj.id,
            "user_id": current_user.id,
        }
        
        new_issue = self.issue_repo.create_issue_with_images(
            issue_data, 
            issue_in.img_paths, 
            created_by=current_user.id
        )
        
        logger.info(f"Issue reported successfully: ID {new_issue.id} for complex ID {complex_obj.id}")
        return new_issue
    
    def admin_create_issue(
        self, 
        issue_in: AdminIssueCreate, 
        current_user: UserModel
    ) -> IssueModel:
        """Create an issue for a specific complex (admin only)."""
        logger.info(f"Admin {current_user.username} (ID: {current_user.id}) creating issue for complex ID {issue_in.complex_id}")
        
        complex_obj = self.complex_repo.get_by_id(issue_in.complex_id)
        if not complex_obj:
            raise HTTPException(status_code=404, detail="Complex not found")
        
        issue_data = {
            "title": issue_in.title,
            "description": issue_in.description,
            "complex_id": issue_in.complex_id,
            "user_id": current_user.id,
        }
        
        new_issue = self.issue_repo.create_issue_with_images(
            issue_data, 
            issue_in.img_paths, 
            created_by=current_user.id
        )
        
        return new_issue
    
    def get_issue_by_id(self, issue_id: int) -> IssueModel:
        """Get issue by ID or raise exception."""
        issue = self.issue_repo.get_by_id(issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        return issue
    
    def list_issues(
        self, 
        current_user: UserModel, 
        complex_id: int = None, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[IssueModel]:
        """List issues based on current user's role."""
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching issues")
        
        if current_user.role == UserRole.ADMIN:
            if complex_id:
                return self.issue_repo.get_issues_by_complex(complex_id, skip, limit)
            return self.issue_repo.get_all(skip, limit)
        
        # Filter by user's assigned complexes
        assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
        
        if current_user.role in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            # See all issues in their complexes
            if complex_id:
                if complex_id in assigned_complex_ids:
                    return self.issue_repo.get_issues_by_complex(complex_id, skip, limit)
                return []
            return self.issue_repo.get_issues_for_complexes(assigned_complex_ids, skip, limit)
        else:
            # Residents see only their own
            return self.issue_repo.get_issues_by_user(current_user.id, skip, limit)
    
    def update_issue(
        self, 
        issue_id: int, 
        issue_in: IssueUpdate, 
        current_user: UserModel
    ) -> IssueModel:
        """Update an issue with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) updating issue ID {issue_id}")
        
        issue = self.issue_repo.get_by_id(issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        # Authorization
        self._validate_update_permission(current_user, issue)
        
        update_data = {}
        
        if issue_in.title:
            update_data["title"] = issue_in.title
        if issue_in.description:
            update_data["description"] = issue_in.description
        if issue_in.status:
            logger.info(f"Issue ID {issue_id} status changing from {issue.status} to {issue_in.status} by {current_user.username}")
            update_data["status"] = issue_in.status
        
        issue = self.issue_repo.update(issue, update_data, updated_by=current_user.id)
        logger.info(f"Issue ID {issue_id} updated successfully")
        return issue
    
    # Private helper methods
    def _get_user_complex(self, user: UserModel):
        """Get the complex assigned to a user."""
        if user.assigned_complexes:
            return user.assigned_complexes[0]
        if user.assigned_buildings:
            return user.assigned_buildings[0].complex
        return None
    
    def _validate_update_permission(self, current_user: UserModel, issue: IssueModel):
        """Validate if current user can update the issue."""
        if current_user.role == UserRole.ADMIN:
            return
        
        if issue.complex not in current_user.assigned_complexes:
            logger.warning(f"Unauthorized update attempt on issue ID {issue.id} by {current_user.username}")
            raise HTTPException(status_code=403, detail="Not enough permissions for this complex")
        
        if current_user.role not in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            logger.warning(f"Unauthorized update attempt on issue ID {issue.id} by {current_user.username} (not staff)")
            raise HTTPException(status_code=403, detail="Only staff (Managers/Attendants) can update issue status")
