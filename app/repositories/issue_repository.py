from typing import List, Optional
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import IssueModel, IssueImageModel
from app.core.entities import IssueStatus
from .base_repository import BaseRepository


class IssueRepository(BaseRepository[IssueModel]):
    """Repository for Issue entity operations."""
    
    def __init__(self, db: Session):
        super().__init__(db, IssueModel)
    
    def get_issues_by_complex(
        self, 
        complex_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[IssueModel]:
        """Get all issues for a specific complex."""
        return self.db.query(IssueModel).filter(
            IssueModel.complex_id == complex_id
        ).offset(skip).limit(limit).all()
    
    def get_issues_by_user(
        self, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[IssueModel]:
        """Get all issues reported by a specific user."""
        return self.db.query(IssueModel).filter(
            IssueModel.user_id == user_id
        ).offset(skip).limit(limit).all()
    
    def get_issues_for_complexes(
        self, 
        complex_ids: List[int], 
        skip: int = 0, 
        limit: int = 50
    ) -> List[IssueModel]:
        """Get all issues for specified complexes."""
        return self.db.query(IssueModel).filter(
            IssueModel.complex_id.in_(complex_ids)
        ).offset(skip).limit(limit).all()
    
    def create_issue_with_images(
        self, 
        issue_data: dict, 
        img_paths: List[str],
        created_by: Optional[int] = None
    ) -> IssueModel:
        """Create an issue with associated images."""
        if created_by is not None:
            issue_data['created_by'] = created_by
        
        issue = IssueModel(**issue_data)
        self.db.add(issue)
        self.db.flush()  # Get the issue ID
        
        for path in img_paths:
            img = IssueImageModel(issue_id=issue.id, img_path=path)
            self.db.add(img)
        
        self.db.commit()
        self.db.refresh(issue)
        return issue
    
    def add_image(self, issue_id: int, img_path: str) -> IssueImageModel:
        """Add an image to an issue."""
        img = IssueImageModel(issue_id=issue_id, img_path=img_path)
        self.db.add(img)
        self.db.commit()
        return img

    def get_status_counts(self, complex_ids: Optional[List[int]] = None) -> List[dict]:
        """Get issue counts grouped by status."""
        query = self.db.query(IssueModel.status, func.count(IssueModel.id))
        if complex_ids:
            query = query.filter(IssueModel.complex_id.in_(complex_ids))
        query = query.group_by(IssueModel.status)
        return [
            {"status": status, "count": count}
            for status, count in query.all()
        ]

    def get_daily_counts(
        self,
        complex_ids: Optional[List[int]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[dict]:
        """Get issue counts grouped by day."""
        day_bucket = func.date(IssueModel.created_date)
        query = self.db.query(day_bucket, func.count(IssueModel.id))
        if complex_ids:
            query = query.filter(IssueModel.complex_id.in_(complex_ids))
        if start_date:
            query = query.filter(IssueModel.created_date >= start_date)
        if end_date:
            query = query.filter(IssueModel.created_date <= end_date)
        query = query.group_by(day_bucket).order_by(day_bucket)
        return [
            {"date": date_value, "count": count}
            for date_value, count in query.all()
        ]

    def get_closed_counts_by_user(
        self,
        complex_ids: Optional[List[int]] = None,
    ) -> List[dict]:
        """Get counts of closed issues grouped by the user who updated them."""
        query = self.db.query(IssueModel.updated_by, func.count(IssueModel.id))
        query = query.filter(IssueModel.status == IssueStatus.CLOSED)
        query = query.filter(IssueModel.updated_by.isnot(None))
        if complex_ids:
            query = query.filter(IssueModel.complex_id.in_(complex_ids))
        query = query.group_by(IssueModel.updated_by)
        return [
            {"user_id": user_id, "count": count}
            for user_id, count in query.all()
        ]

    def get_issue_counts_by_user(
        self,
        complex_ids: Optional[List[int]] = None,
    ) -> List[dict]:
        """Get total issue counts grouped by reporting user."""
        query = self.db.query(IssueModel.user_id, func.count(IssueModel.id))
        if complex_ids:
            query = query.filter(IssueModel.complex_id.in_(complex_ids))
        query = query.group_by(IssueModel.user_id)
        return [
            {"user_id": user_id, "count": count}
            for user_id, count in query.all()
        ]

    def get_issue_counts_by_building(
        self,
        complex_ids: Optional[List[int]] = None,
    ) -> List[dict]:
        """Get total issue counts grouped by building."""
        from app.models.models import BuildingModel, UserModel

        query = (
            self.db.query(BuildingModel.id, BuildingModel.name, func.count(IssueModel.id))
            .outerjoin(UserModel, BuildingModel.residents)
            .outerjoin(IssueModel, IssueModel.user_id == UserModel.id)
        )
        if complex_ids:
            query = query.filter(BuildingModel.complex_id.in_(complex_ids))
        query = query.group_by(BuildingModel.id, BuildingModel.name)
        return [
            {"building_id": building_id, "building_name": name, "count": count}
            for building_id, name, count in query.all()
        ]

    def get_issue_counts_by_category(
        self,
        complex_ids: Optional[List[int]] = None,
    ) -> List[dict]:
        """Get total issue counts grouped by category."""
        from app.models.models import IssueCategoryModel

        query = (
            self.db.query(IssueCategoryModel.id, IssueCategoryModel.name, func.count(IssueModel.id))
            .outerjoin(IssueModel, IssueModel.category_id == IssueCategoryModel.id)
        )
        if complex_ids:
            query = query.filter(IssueCategoryModel.complex_id.in_(complex_ids))
        query = query.group_by(IssueCategoryModel.id, IssueCategoryModel.name)
        return [
            {"category_id": category_id, "category_name": name, "count": count}
            for category_id, name, count in query.all()
        ]
