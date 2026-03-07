from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.models import IssueModel, IssueImageModel
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
