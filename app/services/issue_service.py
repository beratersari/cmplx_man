from typing import List, Optional
from datetime import datetime
import json
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import IssueRepository, ComplexRepository, UserRepository, IssueCategoryRepository, AnnouncementRepository
from app.models.models import UserModel, IssueModel, CommentModel
from app.core.entities import UserRole, IssueStatus, IssuePriority
from app.api.v1.schemas import (
    IssueCreate,
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
    EmotionCount,
)
from app.core.logging_config import logger
from app.services.notification_service import NotificationService


class IssueService:
    """Service for issue-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.issue_repo = IssueRepository(db)
        self.complex_repo = ComplexRepository(db)
        self.user_repo = UserRepository(db)
        self.category_repo = IssueCategoryRepository(db)
        self.comment_repo = AnnouncementRepository(db)
        self.notification_service = NotificationService(db)
    
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
        
        # Validate category exists and belongs to the user's complex
        category = self.category_repo.get_by_id(issue_in.category_id)
        if not category:
            logger.warning(f"Issue report failed: Category ID {issue_in.category_id} not found")
            raise HTTPException(status_code=404, detail="Category not found")
        if category.complex_id != complex_obj.id:
            logger.warning(f"Issue report failed: Category ID {issue_in.category_id} does not belong to user's complex")
            raise HTTPException(status_code=403, detail="Category does not belong to your complex")
        
        building_id = current_user.assigned_buildings[0].id if current_user.assigned_buildings else 0
        issue_data = {
            "title": issue_in.title,
            "description": issue_in.description,
            "complex_id": complex_obj.id,
            "building_id": building_id,
            "category_id": issue_in.category_id,
            "priority": issue_in.priority,
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
        
        # Validate category exists and belongs to the complex
        category = self.category_repo.get_by_id(issue_in.category_id)
        if not category:
            logger.warning(f"Issue creation failed: Category ID {issue_in.category_id} not found")
            raise HTTPException(status_code=404, detail="Category not found")
        if category.complex_id != issue_in.complex_id:
            logger.warning(f"Issue creation failed: Category ID {issue_in.category_id} does not belong to the specified complex")
            raise HTTPException(status_code=400, detail="Category does not belong to the specified complex")
        
        building_id = current_user.assigned_buildings[0].id if current_user.assigned_buildings else 0
        issue_data = {
            "title": issue_in.title,
            "description": issue_in.description,
            "complex_id": issue_in.complex_id,
            "building_id": building_id,
            "category_id": issue_in.category_id,
            "priority": issue_in.priority,
            "user_id": current_user.id,
        }
        
        new_issue = self.issue_repo.create_issue_with_images(
            issue_data, 
            issue_in.img_paths, 
            created_by=current_user.id
        )
        
        return new_issue
    
    def get_issue_by_id(self, issue_id: int, current_user: UserModel = None) -> IssueModel:
        """Get issue by ID or raise exception."""
        issue = self.issue_repo.get_by_id(issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        if current_user:
            self._validate_view_permission(current_user, issue)
        return issue
    
    def list_issues(
        self, 
        current_user: UserModel, 
        complex_id: int = None, 
        skip: int = 0, 
        limit: int = 50,
        category_id: int = None,
        status: IssueStatus = None,
        priority: IssuePriority = None,
    ) -> List[IssueModel]:
        """List issues based on current user's role."""
        if status and isinstance(status, str):
            try:
                status = IssueStatus(status)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid issue status") from exc
        if priority and isinstance(priority, str):
            try:
                priority = IssuePriority(priority)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid issue priority") from exc
        logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching issues")
        
        if current_user.role == UserRole.ADMIN:
            if complex_id:
                return self.issue_repo.get_issues_by_complex(
                    complex_id,
                    skip,
                    limit,
                    category_id=category_id,
                    status=status,
                    priority=priority,
                )
            return self.issue_repo.get_all_filtered(
                skip,
                limit,
                category_id=category_id,
                status=status,
                priority=priority,
            )
        
        # Filter by user's assigned complexes
        assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
        
        if current_user.role in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            # See all issues in their complexes
            if complex_id:
                if complex_id in assigned_complex_ids:
                    return self.issue_repo.get_issues_by_complex(
                        complex_id,
                        skip,
                        limit,
                        category_id=category_id,
                        status=status,
                        priority=priority,
                    )
                return []
            return self.issue_repo.get_issues_for_complexes(
                assigned_complex_ids,
                skip,
                limit,
                category_id=category_id,
                status=status,
                priority=priority,
            )
        else:
            # Residents see only their own
            return self.issue_repo.get_issues_by_user(
                current_user.id,
                skip,
                limit,
                category_id=category_id,
                status=status,
                priority=priority,
            )
    
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
        if issue_in.priority:
            update_data["priority"] = issue_in.priority
        
        issue = self.issue_repo.update(issue, update_data, updated_by=current_user.id)
        self._notify_issue_update(issue, current_user)
        logger.info(f"Issue ID {issue_id} updated successfully")
        return issue

    def get_issue_comments(self, issue_id: int, current_user: UserModel):
        """Get comments for an issue."""
        issue = self.issue_repo.get_by_id(issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        self._validate_view_permission(current_user, issue)
        return self._build_issue_comment_tree(issue.id)

    def add_issue_comment(self, issue_id: int, comment_in: CommentCreate, current_user: UserModel):
        """Create a new top-level comment on an issue."""
        issue = self.issue_repo.get_by_id(issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        self._validate_view_permission(current_user, issue)
        new_comment = self.comment_repo.create_comment(
            announcement_id=None,
            content=comment_in.content,
            user_id=current_user.id,
            parent_id=None,
            issue_id=issue_id,
        )
        return self._build_issue_comment_out(new_comment)

    def add_issue_reply(self, issue_id: int, reply_in: ReplyCreate, current_user: UserModel):
        """Create a reply to a comment on an issue."""
        issue = self.issue_repo.get_by_id(issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        self._validate_view_permission(current_user, issue)
        parent = self.comment_repo.get_comment_by_id(reply_in.parent_id)
        if not parent or parent.issue_id != issue_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        new_reply = self.comment_repo.create_comment(
            announcement_id=None,
            content=reply_in.content,
            user_id=current_user.id,
            parent_id=reply_in.parent_id,
            issue_id=issue_id,
        )
        return self._build_issue_comment_out(new_reply)

    def update_issue_comment(self, comment_id: int, comment_in: CommentCreate, current_user: UserModel):
        """Update a comment on an issue (creator only)."""
        comment = self.comment_repo.get_comment_by_id(comment_id)
        if not comment or not comment.issue_id:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Only the creator can edit this comment")
        comment = self.comment_repo.update_comment(comment, comment_in.content, current_user.id)
        self.comment_repo.clear_comment_reactions(comment_id)
        return self._build_issue_comment_out(comment)

    def delete_issue_comment(self, comment_id: int, current_user: UserModel):
        """Delete a comment on an issue."""
        comment = self.comment_repo.get_comment_by_id(comment_id)
        if not comment or not comment.issue_id:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment.created_by != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.SITE_MANAGER]:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        self.comment_repo.delete_comment(comment)
        return {"message": "Comment deleted successfully"}

    def _build_issue_comment_tree(self, issue_id: int, parent_id: int = None):
        """Recursively build issue comment tree."""
        comments = self.comment_repo.get_comments_by_issue(issue_id, parent_id)
        return [self._build_issue_comment_out(comment) for comment in comments]

    def _build_issue_comment_out(self, comment: CommentModel) -> CommentOut:
        """Build CommentOut for issue comments."""
        creator = self.user_repo.get_by_id(comment.created_by) if comment.created_by else None
        emotion_counts = self.comment_repo.get_comment_emotion_counts(comment.id)
        return CommentOut(
            id=comment.id,
            content=comment.content,
            announcement_id=comment.announcement_id,
            issue_id=comment.issue_id,
            parent_id=comment.parent_id,
            created_date=comment.created_date,
            created_by=comment.created_by,
            username=creator.username if creator else "Unknown",
            emotion_counts=[EmotionCount(emoji=e.emoji, count=e.count) for e in emotion_counts],
            replies=self._build_issue_comment_tree(comment.issue_id, comment.id),
        )

    def get_issue_status_summary_for_manager(
        self,
        current_user: UserModel,
    ) -> IssueStatusSummary:
        """Get issue status summary counts for a manager's complex."""
        complex_id = self._get_manager_complex_id(current_user)
        return self._build_issue_status_summary([complex_id])

    def get_issue_status_summary_for_admin(self, complex_id: int) -> IssueStatusSummary:
        """Get issue status summary counts for a specific complex (admin)."""
        self._ensure_complex_exists(complex_id)
        return self._build_issue_status_summary([complex_id])

    def _build_issue_status_summary(self, complex_ids: List[int]) -> IssueStatusSummary:
        """Build issue status summary counts for complexes."""
        status_counts = self.issue_repo.get_status_counts(complex_ids)
        summary = {
            IssueStatus.OPEN: 0,
            IssueStatus.IN_PROGRESS: 0,
            IssueStatus.RESOLVED: 0,
            IssueStatus.CLOSED: 0,
        }
        total = 0
        for item in status_counts:
            status = item["status"]
            count = item["count"]
            if status in summary:
                summary[status] = count
                total += count
        return IssueStatusSummary(
            open=summary[IssueStatus.OPEN],
            in_progress=summary[IssueStatus.IN_PROGRESS],
            resolved=summary[IssueStatus.RESOLVED],
            closed=summary[IssueStatus.CLOSED],
            total=total,
        )

    def get_issue_daily_counts_for_manager(
        self,
        current_user: UserModel,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[IssueDailyCount]:
        """Get issue counts per day for a manager's complex."""
        complex_id = self._get_manager_complex_id(current_user)
        return self._build_issue_daily_counts([complex_id], start_date, end_date)

    def get_issue_daily_counts_for_admin(
        self,
        complex_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[IssueDailyCount]:
        """Get issue counts per day for a specific complex (admin)."""
        self._ensure_complex_exists(complex_id)
        return self._build_issue_daily_counts([complex_id], start_date, end_date)

    def _build_issue_daily_counts(
        self,
        complex_ids: List[int],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[IssueDailyCount]:
        """Build issue counts per day for complexes."""
        items = self.issue_repo.get_daily_counts(complex_ids, start_date, end_date)
        return [
            IssueDailyCount(
                date=str(item["date"]),
                count=item["count"],
            )
            for item in items
        ]

    def get_closed_issues_by_user_for_manager(
        self,
        current_user: UserModel,
    ) -> List[IssueClosedByUser]:
        """Get counts of closed issues grouped by updater for a manager's complex."""
        complex_id = self._get_manager_complex_id(current_user)
        return self._build_closed_issues_by_user([complex_id])

    def get_closed_issues_by_user_for_admin(
        self,
        complex_id: int,
    ) -> List[IssueClosedByUser]:
        """Get counts of closed issues grouped by updater for a specific complex (admin)."""
        self._ensure_complex_exists(complex_id)
        return self._build_closed_issues_by_user([complex_id])

    def _build_closed_issues_by_user(self, complex_ids: List[int]) -> List[IssueClosedByUser]:
        """Build closed issue counts by updater for complexes."""
        items = self.issue_repo.get_closed_counts_by_user(complex_ids)
        result = []
        for item in items:
            user = self.user_repo.get_by_id(item["user_id"])
            if user:
                result.append(
                    IssueClosedByUser(
                        user_id=user.id,
                        username=user.username,
                        closed_count=item["count"],
                    )
                )
        return result

    def get_issue_counts_by_building_for_manager(
        self,
        current_user: UserModel,
    ) -> List[IssueCountByBuilding]:
        """Get issue counts grouped by building for a manager's complex."""
        complex_id = self._get_manager_complex_id(current_user)
        return self._build_issue_counts_by_building([complex_id])

    def get_issue_counts_by_building_for_admin(
        self,
        complex_id: int,
    ) -> List[IssueCountByBuilding]:
        """Get issue counts grouped by building for a specific complex (admin)."""
        self._ensure_complex_exists(complex_id)
        return self._build_issue_counts_by_building([complex_id])

    def _build_issue_counts_by_building(self, complex_ids: List[int]) -> List[IssueCountByBuilding]:
        """Build issue counts grouped by building for complexes."""
        items = self.issue_repo.get_issue_counts_by_building(complex_ids)
        return [
            IssueCountByBuilding(
                building_id=item["building_id"],
                building_name=item["building_name"],
                issue_count=item["count"],
            )
            for item in items
        ]

    def get_issue_counts_by_user_for_manager(
        self,
        current_user: UserModel,
    ) -> List[IssueCountByUser]:
        """Get issue counts grouped by reporting user for a manager's complex."""
        complex_id = self._get_manager_complex_id(current_user)
        return self._build_issue_counts_by_user([complex_id])

    def get_issue_counts_by_user_for_admin(
        self,
        complex_id: int,
    ) -> List[IssueCountByUser]:
        """Get issue counts grouped by reporting user for a specific complex (admin)."""
        self._ensure_complex_exists(complex_id)
        return self._build_issue_counts_by_user([complex_id])

    def _build_issue_counts_by_user(self, complex_ids: List[int]) -> List[IssueCountByUser]:
        """Build issue counts grouped by reporting user for complexes."""
        items = self.issue_repo.get_issue_counts_by_user(complex_ids)
        result = []
        for item in items:
            user = self.user_repo.get_by_id(item["user_id"])
            if user:
                result.append(
                    IssueCountByUser(
                        user_id=user.id,
                        username=user.username,
                        issue_count=item["count"],
                    )
                )
        return result

    def get_issue_counts_by_category_for_manager(
        self,
        current_user: UserModel,
    ) -> List[IssueCountByCategory]:
        """Get issue counts grouped by category for a manager's complex."""
        complex_id = self._get_manager_complex_id(current_user)
        return self._build_issue_counts_by_category([complex_id])

    def get_issue_counts_by_category_for_admin(
        self,
        complex_id: int,
    ) -> List[IssueCountByCategory]:
        """Get issue counts grouped by category for a specific complex (admin)."""
        self._ensure_complex_exists(complex_id)
        return self._build_issue_counts_by_category([complex_id])

    def get_issue_heatmap_for_user(
        self,
        current_user: UserModel,
        category_id: int = None,
        priority: IssuePriority = None,
    ) -> List[IssueHeatmapPoint]:
        """Get issue heatmap data for the current user's complexes."""
        if priority and isinstance(priority, str):
            try:
                priority = IssuePriority(priority)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid issue priority") from exc
        complex_ids = [complex.id for complex in current_user.assigned_complexes]
        building_complex_ids = [building.complex_id for building in current_user.assigned_buildings]
        complex_ids = list({*complex_ids, *building_complex_ids})
        if not complex_ids and current_user.role == UserRole.ADMIN:
            complex_ids = [complex.id for complex in self.complex_repo.get_all_active()]
        if not complex_ids:
            raise HTTPException(status_code=400, detail="User is not assigned to any complex")
        return self._build_issue_heatmap(complex_ids, category_id, priority)

    def get_issue_heatmap_for_admin(
        self,
        complex_id: int,
        category_id: int = None,
        priority: IssuePriority = None,
    ) -> List[IssueHeatmapPoint]:
        """Get issue heatmap data for a specific complex (admin)."""
        if priority and isinstance(priority, str):
            try:
                priority = IssuePriority(priority)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid issue priority") from exc
        self._ensure_complex_exists(complex_id)
        return self._build_issue_heatmap([complex_id], category_id, priority)

    def _build_issue_counts_by_category(self, complex_ids: List[int]) -> List[IssueCountByCategory]:
        """Build issue counts grouped by category for complexes."""
        items = self.issue_repo.get_issue_counts_by_category(complex_ids)
        return [
            IssueCountByCategory(
                category_id=item["category_id"],
                category_name=item["category_name"],
                issue_count=item["count"],
            )
            for item in items
        ]

    def _build_issue_heatmap(
        self,
        complex_ids: List[int],
        category_id: int = None,
        priority: IssuePriority = None,
    ) -> List[IssueHeatmapPoint]:
        """Build issue heatmap points for complexes."""
        items = self.issue_repo.get_issue_heatmap_counts(
            complex_ids=complex_ids,
            category_id=category_id,
            priority=priority,
        )
        return [
            IssueHeatmapPoint(
                day=item["day"],
                hour=item["hour"],
                count=item["count"],
            )
            for item in items
        ]
    
    # Private helper methods
    def _get_user_complex(self, user: UserModel):
        """Get the complex assigned to a user."""
        if user.assigned_complexes:
            return user.assigned_complexes[0]
        if user.assigned_buildings:
            return user.assigned_buildings[0].complex
        return None

    def _get_manager_complex_id(self, current_user: UserModel) -> int:
        """Get a manager's assigned complex ID."""
        if current_user.role != UserRole.SITE_MANAGER:
            raise HTTPException(status_code=403, detail="Only site managers can access this endpoint")
        if not current_user.assigned_complexes:
            raise HTTPException(status_code=400, detail="Manager is not assigned to any complex")
        return current_user.assigned_complexes[0].id

    def _ensure_complex_exists(self, complex_id: int) -> None:
        """Ensure the complex exists."""
        if not self.complex_repo.get_by_id(complex_id):
            raise HTTPException(status_code=404, detail="Complex not found")

    def _notify_issue_update(self, issue: IssueModel, current_user: UserModel) -> None:
        """Notify the issue reporter about updates."""
        if issue.user_id == current_user.id:
            return
        title = f"Issue #{issue.id} updated"
        message = f"{issue.title} is now {issue.status.value} ({issue.priority.value} priority)."
        data = {
            "issue_id": issue.id,
            "status": issue.status.value,
            "priority": issue.priority.value,
            "updated_by": current_user.id,
        }

        self.notification_service.create_notification(
            user_id=issue.user_id,
            notification_type="issue_update",
            title=title,
            message=message,
            data=json.dumps(data),
        )
    
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

    def _validate_view_permission(self, current_user: UserModel, issue: IssueModel):
        """Validate if current user can view the issue."""
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.role in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            if issue.complex in current_user.assigned_complexes:
                return
            raise HTTPException(status_code=403, detail="Not enough permissions for this complex")
        if issue.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions to view this issue")
