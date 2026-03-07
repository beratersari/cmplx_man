from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import (
    AnnouncementModel, 
    AnnouncementEmotionModel,
    CommentModel,
    CommentEmotionModel,
    UserModel
)
from .base_repository import BaseRepository


class AnnouncementRepository(BaseRepository[AnnouncementModel]):
    """Repository for Announcement entity operations."""
    
    def __init__(self, db: Session):
        super().__init__(db, AnnouncementModel)
    
    def get_announcements_by_complex(
        self, 
        complex_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[AnnouncementModel]:
        """Get all announcements for a specific complex."""
        return self.db.query(AnnouncementModel).filter(
            AnnouncementModel.complex_id == complex_id
        ).offset(skip).limit(limit).all()
    
    def get_announcements_for_complexes(
        self, 
        complex_ids: List[int], 
        skip: int = 0, 
        limit: int = 50
    ) -> List[AnnouncementModel]:
        """Get all announcements for specified complexes."""
        return self.db.query(AnnouncementModel).filter(
            AnnouncementModel.complex_id.in_(complex_ids)
        ).offset(skip).limit(limit).all()
    
    def get_emotion_counts(self, announcement_id: int) -> List:
        """Get emotion counts for an announcement."""
        return self.db.query(
            AnnouncementEmotionModel.emoji,
            func.count(AnnouncementEmotionModel.id).label('count')
        ).filter(
            AnnouncementEmotionModel.announcement_id == announcement_id
        ).group_by(AnnouncementEmotionModel.emoji).all()
    
    def get_user_reactions(self, announcement_id: int) -> List:
        """Get all user reactions for an announcement."""
        return self.db.query(AnnouncementEmotionModel).filter(
            AnnouncementEmotionModel.announcement_id == announcement_id
        ).all()
    
    def get_user_reaction(
        self, 
        announcement_id: int, 
        user_id: int
    ) -> Optional[AnnouncementEmotionModel]:
        """Get a specific user's reaction to an announcement."""
        return self.db.query(AnnouncementEmotionModel).filter(
            AnnouncementEmotionModel.announcement_id == announcement_id,
            AnnouncementEmotionModel.user_id == user_id
        ).first()
    
    def create_reaction(
        self, 
        announcement_id: int, 
        user_id: int, 
        emoji: str
    ) -> AnnouncementEmotionModel:
        """Create a new reaction to an announcement."""
        reaction = AnnouncementEmotionModel(
            announcement_id=announcement_id,
            user_id=user_id,
            emoji=emoji
        )
        self.db.add(reaction)
        self.db.commit()
        return reaction
    
    def update_reaction(
        self, 
        reaction: AnnouncementEmotionModel, 
        emoji: str
    ) -> AnnouncementEmotionModel:
        """Update an existing reaction."""
        reaction.emoji = emoji
        self.db.commit()
        return reaction
    
    def delete_reaction(self, reaction: AnnouncementEmotionModel) -> None:
        """Delete a reaction."""
        self.db.delete(reaction)
        self.db.commit()
    
    # Comment-related methods
    def get_comments_by_announcement(
        self, 
        announcement_id: int, 
        parent_id: Optional[int] = None
    ) -> List[CommentModel]:
        """Get comments for an announcement, optionally filtered by parent."""
        query = self.db.query(CommentModel).filter(
            CommentModel.announcement_id == announcement_id
        )
        if parent_id is not None:
            query = query.filter(CommentModel.parent_id == parent_id)
        else:
            query = query.filter(CommentModel.parent_id == None)
        return query.all()
    
    def get_comment_by_id(self, comment_id: int) -> Optional[CommentModel]:
        """Get a comment by ID."""
        return self.db.query(CommentModel).filter(
            CommentModel.id == comment_id
        ).first()
    
    def create_comment(
        self, 
        announcement_id: int,
        content: str,
        user_id: int,
        parent_id: Optional[int] = None
    ) -> CommentModel:
        """Create a new comment."""
        comment = CommentModel(
            content=content,
            announcement_id=announcement_id,
            parent_id=parent_id,
            created_by=user_id
        )
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment
    
    def update_comment(
        self, 
        comment: CommentModel, 
        content: str, 
        user_id: int
    ) -> CommentModel:
        """Update a comment."""
        comment.content = content
        comment.updated_by = user_id
        self.db.commit()
        self.db.refresh(comment)
        return comment
    
    def delete_comment(self, comment: CommentModel) -> None:
        """Delete a comment."""
        self.db.delete(comment)
        self.db.commit()
    
    def get_comment_emotion_counts(self, comment_id: int) -> List:
        """Get emotion counts for a comment."""
        return self.db.query(
            CommentEmotionModel.emoji,
            func.count(CommentEmotionModel.id).label('count')
        ).filter(
            CommentEmotionModel.comment_id == comment_id
        ).group_by(CommentEmotionModel.emoji).all()
    
    def get_comment_user_reaction(
        self, 
        comment_id: int, 
        user_id: int
    ) -> Optional[CommentEmotionModel]:
        """Get a specific user's reaction to a comment."""
        return self.db.query(CommentEmotionModel).filter(
            CommentEmotionModel.comment_id == comment_id,
            CommentEmotionModel.user_id == user_id
        ).first()
    
    def create_comment_reaction(
        self, 
        comment_id: int, 
        user_id: int, 
        emoji: str
    ) -> CommentEmotionModel:
        """Create a new reaction to a comment."""
        reaction = CommentEmotionModel(
            comment_id=comment_id,
            user_id=user_id,
            emoji=emoji
        )
        self.db.add(reaction)
        self.db.commit()
        return reaction
    
    def update_comment_reaction(
        self, 
        reaction: CommentEmotionModel, 
        emoji: str
    ) -> CommentEmotionModel:
        """Update an existing comment reaction."""
        reaction.emoji = emoji
        self.db.commit()
        return reaction
    
    def delete_comment_reaction(self, reaction: CommentEmotionModel) -> None:
        """Delete a comment reaction."""
        self.db.delete(reaction)
        self.db.commit()
    
    def clear_comment_reactions(self, comment_id: int) -> None:
        """Clear all reactions for a comment."""
        self.db.query(CommentEmotionModel).filter(
            CommentEmotionModel.comment_id == comment_id
        ).delete()
        self.db.commit()
    
    def get_comment_reactions(self, comment_id: int) -> List:
        """Get all reactions for a comment."""
        return self.db.query(CommentEmotionModel).filter(
            CommentEmotionModel.comment_id == comment_id
        ).all()
