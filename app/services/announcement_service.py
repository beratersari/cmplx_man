from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import (
    AnnouncementRepository, 
    ComplexRepository, 
    UserRepository,
    AnnouncementReadRepository
)
from app.models.models import UserModel, AnnouncementModel, CommentModel
from app.core.entities import UserRole
from app.api.v1.schemas import (
    AnnouncementCreate, 
    EmotionCreate, 
    CommentCreate, 
    ReplyCreate,
    CommentOut,
    EmotionCount,
    UserReaction,
    AnnouncementOut,
    AnnouncementReadStats,
    AnnouncementReadOut,
    UserOut
)
from app.core.logging_config import logger


class AnnouncementService:
    """Service for announcement-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.announcement_repo = AnnouncementRepository(db)
        self.complex_repo = ComplexRepository(db)
        self.user_repo = UserRepository(db)
        self.read_repo = AnnouncementReadRepository(db)
    
    def create_announcement(
        self, 
        announcement_in: AnnouncementCreate, 
        current_user: UserModel
    ) -> AnnouncementModel:
        """Create a new announcement with authorization checks."""
        logger.info(f"User {current_user.username} (ID: {current_user.id}) creating announcement: {announcement_in.title}")
        
        # Check complex exists
        complex_obj = self.complex_repo.get_by_id(announcement_in.complex_id)
        if not complex_obj:
            logger.error(f"Announcement creation failed: Complex ID {announcement_in.complex_id} not found")
            raise HTTPException(status_code=404, detail="Residential complex not found")
        
        # Authorization
        self._validate_create_permission(current_user, complex_obj)
        
        announcement_data = {
            "title": announcement_in.title,
            "description": announcement_in.description,
            "img_path": announcement_in.img_path,
            "complex_id": announcement_in.complex_id,
            "comments_enabled": announcement_in.comments_enabled,
        }
        
        new_announcement = self.announcement_repo.create(announcement_data, created_by=current_user.id)
        logger.info(f"Announcement created successfully: {new_announcement.title} (ID: {new_announcement.id})")
        return new_announcement
    
    def get_announcement_by_id(self, announcement_id: int, current_user: UserModel) -> AnnouncementOut:
        """Get announcement by ID and mark it as read for the current user."""
        announcement = self.announcement_repo.get_by_id(announcement_id)
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        self._validate_access_permission(current_user, announcement)
        
        # Mark as read if not already
        existing = self.read_repo.get_by_announcement_and_user(announcement_id, current_user.id)
        if not existing:
            self.read_repo.create({
                "announcement_id": announcement_id,
                "user_id": current_user.id
            })
            logger.info(f"User {current_user.username} (ID: {current_user.id}) marked announcement {announcement_id} as read")
        
        return self._enrich_announcement(announcement, current_user)

    def get_read_stats(self, announcement_id: int, current_user: UserModel) -> AnnouncementReadStats:
        """Get read/unread statistics for an announcement. Staff only."""
        announcement = self.announcement_repo.get_by_id(announcement_id)
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        if current_user.role not in [UserRole.ADMIN, UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            raise HTTPException(status_code=403, detail="Only staff can view read statistics")
        
        self._validate_access_permission(current_user, announcement)
        
        reads = self.read_repo.get_reads_by_announcement(announcement_id)
        read_user_ids = [r.user_id for r in reads]
        
        # Get all users assigned to this complex
        complex_obj = self.complex_repo.get_by_id(announcement.complex_id)
        all_users = complex_obj.assigned_users
        
        read_by = []
        for r in reads:
            user = self.user_repo.get_by_id(r.user_id)
            if user:
                read_by.append(AnnouncementReadOut(
                    user_id=user.id,
                    username=user.username,
                    read_date=r.read_date
                ))
        
        unread_by = []
        for u in all_users:
            if u.id not in read_user_ids:
                unread_by.append(UserOut.from_orm(u))
        
        return AnnouncementReadStats(
            announcement_id=announcement_id,
            read_count=len(read_by),
            unread_count=len(unread_by),
            read_by=read_by,
            unread_by=unread_by
        )

    def list_announcements(
        self, 
        current_user: UserModel, 
        complex_id: int = None, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[dict]:
        """List announcements with enriched data."""
        # Get announcements based on filters and user role
        if current_user.role == UserRole.ADMIN:
            if complex_id:
                announcements = self.announcement_repo.get_announcements_by_complex(complex_id, skip, limit)
            else:
                announcements = self.announcement_repo.get_all(skip, limit)
        else:
            assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
            if current_user.role == UserRole.SITE_RESIDENT:
                building_complex_ids = [b.complex_id for b in current_user.assigned_buildings]
                assigned_complex_ids = list(set(assigned_complex_ids + building_complex_ids))
            
            if complex_id:
                if complex_id in assigned_complex_ids:
                    announcements = self.announcement_repo.get_announcements_by_complex(complex_id, skip, limit)
                else:
                    announcements = []
            else:
                announcements = self.announcement_repo.get_announcements_for_complexes(assigned_complex_ids, skip, limit)
        
        # Enrich announcements with emotion counts, comments, and read status
        result = []
        for a in announcements:
            a_out = self._enrich_announcement(a, current_user)
            result.append(a_out)
        
        return result
    
    def update_announcement(
        self, 
        announcement_id: int, 
        announcement_in: AnnouncementCreate, 
        current_user: UserModel
    ) -> AnnouncementModel:
        """Update an announcement with authorization checks."""
        announcement = self.announcement_repo.get_by_id(announcement_id)
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        self._validate_modify_permission(current_user, announcement)
        
        update_data = {
            "title": announcement_in.title,
            "description": announcement_in.description,
            "img_path": announcement_in.img_path,
            "comments_enabled": announcement_in.comments_enabled,
        }
        
        announcement = self.announcement_repo.update(announcement, update_data, updated_by=current_user.id)
        return announcement
    
    def delete_announcement(self, announcement_id: int, current_user: UserModel) -> dict:
        """Delete an announcement with authorization checks."""
        announcement = self.announcement_repo.get_by_id(announcement_id)
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        self._validate_modify_permission(current_user, announcement)
        
        self.announcement_repo.delete(announcement)
        return {"message": "Announcement deleted successfully"}
    
    def react_to_announcement(
        self, 
        announcement_id: int, 
        emotion_in: EmotionCreate, 
        current_user: UserModel
    ) -> dict:
        """Add or update a reaction to an announcement."""
        announcement = self.announcement_repo.get_by_id(announcement_id)
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        self._validate_access_permission(current_user, announcement)
        
        existing = self.announcement_repo.get_user_reaction(announcement_id, current_user.id)
        
        if existing:
            self.announcement_repo.update_reaction(existing, emotion_in.emoji)
        else:
            self.announcement_repo.create_reaction(announcement_id, current_user.id, emotion_in.emoji)
        
        return {"message": "Reaction recorded"}
    
    def get_announcement_reactions(
        self, 
        announcement_id: int, 
        current_user: UserModel,
        skip: int = 0, 
        limit: int = 50
    ) -> List[UserReaction]:
        """Get all reactions for an announcement."""
        reactions = self.announcement_repo.get_user_reactions(announcement_id)
        
        result = []
        for r in reactions[skip:skip + limit]:
            user = self.user_repo.get_by_id(r.user_id)
            if user:
                result.append(UserReaction(user_id=user.id, username=user.username, emoji=r.emoji))
        return result
    
    def remove_announcement_reaction(
        self, 
        announcement_id: int, 
        current_user: UserModel
    ) -> dict:
        """Remove a user's reaction from an announcement."""
        emotion = self.announcement_repo.get_user_reaction(announcement_id, current_user.id)
        
        if not emotion:
            raise HTTPException(status_code=404, detail="Reaction not found")
        
        self.announcement_repo.delete_reaction(emotion)
        return {"message": "Reaction removed"}
    
    # Comment-related methods
    def create_comment(
        self, 
        announcement_id: int, 
        comment_in: CommentCreate, 
        current_user: UserModel
    ) -> CommentOut:
        """Create a new top-level comment on an announcement."""
        announcement = self.announcement_repo.get_by_id(announcement_id)
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        if not announcement.comments_enabled:
            raise HTTPException(status_code=400, detail="Comments are disabled for this announcement")
        
        self._validate_access_permission(current_user, announcement)
        
        new_comment = self.announcement_repo.create_comment(
            announcement_id=announcement_id,
            content=comment_in.content,
            user_id=current_user.id,
            parent_id=None
        )
        
        return CommentOut(
            id=new_comment.id,
            content=new_comment.content,
            announcement_id=new_comment.announcement_id,
            parent_id=new_comment.parent_id,
            created_date=new_comment.created_date,
            created_by=new_comment.created_by,
            username=current_user.username,
            emotion_counts=[],
            replies=[]
        )
    
    def create_reply(
        self, 
        announcement_id: int, 
        reply_in: ReplyCreate, 
        current_user: UserModel
    ) -> CommentOut:
        """Create a reply to a comment on an announcement."""
        announcement = self.announcement_repo.get_by_id(announcement_id)
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        if not announcement.comments_enabled:
            raise HTTPException(status_code=400, detail="Comments are disabled for this announcement")
        
        self._validate_access_permission(current_user, announcement)
        
        # Validate parent comment exists and belongs to this announcement
        parent = self.announcement_repo.get_comment_by_id(reply_in.parent_id)
        if not parent or parent.announcement_id != announcement_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        
        new_reply = self.announcement_repo.create_comment(
            announcement_id=announcement_id,
            content=reply_in.content,
            user_id=current_user.id,
            parent_id=reply_in.parent_id
        )
        
        return CommentOut(
            id=new_reply.id,
            content=new_reply.content,
            announcement_id=new_reply.announcement_id,
            parent_id=new_reply.parent_id,
            created_date=new_reply.created_date,
            created_by=new_reply.created_by,
            username=current_user.username,
            emotion_counts=[],
            replies=[]
        )
    
    def get_comment_by_id(self, comment_id: int) -> CommentModel:
        """Get comment by ID or raise exception."""
        comment = self.announcement_repo.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        return comment
    
    def update_comment(
        self, 
        comment_id: int, 
        comment_in: CommentCreate, 
        current_user: UserModel
    ) -> CommentOut:
        """Update a comment (creator only)."""
        comment = self.announcement_repo.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        if comment.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Only the creator can edit this comment")
        
        comment = self.announcement_repo.update_comment(comment, comment_in.content, current_user.id)
        
        # Reset reactions on edit
        self.announcement_repo.clear_comment_reactions(comment_id)
        
        return CommentOut(
            id=comment.id,
            content=comment.content,
            announcement_id=comment.announcement_id,
            parent_id=comment.parent_id,
            created_date=comment.created_date,
            created_by=comment.created_by,
            username=current_user.username,
            emotion_counts=[],
            replies=[]
        )
    
    def delete_comment(self, comment_id: int, current_user: UserModel) -> dict:
        """Delete a comment with authorization checks."""
        comment = self.announcement_repo.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        self._validate_comment_delete_permission(current_user, comment)
        
        self.announcement_repo.delete_comment(comment)
        return {"message": "Comment deleted successfully"}
    
    def react_to_comment(
        self, 
        comment_id: int, 
        emotion_in: EmotionCreate, 
        current_user: UserModel
    ) -> dict:
        """Add or update a reaction to a comment."""
        comment = self.announcement_repo.get_comment_by_id(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        existing = self.announcement_repo.get_comment_user_reaction(comment_id, current_user.id)
        
        if existing:
            self.announcement_repo.update_comment_reaction(existing, emotion_in.emoji)
        else:
            self.announcement_repo.create_comment_reaction(comment_id, current_user.id, emotion_in.emoji)
        
        return {"message": "Reaction recorded"}
    
    def get_comment_reactions(
        self, 
        comment_id: int, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[UserReaction]:
        """Get all reactions for a comment."""
        reactions = self.announcement_repo.get_comment_reactions(comment_id)
        
        result = []
        for r in reactions[skip:skip + limit]:
            user = self.user_repo.get_by_id(r.user_id)
            if user:
                result.append(UserReaction(user_id=user.id, username=user.username, emoji=r.emoji))
        return result
    
    def remove_comment_reaction(
        self, 
        comment_id: int, 
        current_user: UserModel
    ) -> dict:
        """Remove a user's reaction from a comment."""
        emotion = self.announcement_repo.get_comment_user_reaction(comment_id, current_user.id)
        
        if not emotion:
            raise HTTPException(status_code=404, detail="Reaction not found")
        
        self.announcement_repo.delete_comment_reaction(emotion)
        return {"message": "Reaction removed"}
    
    def search_announcements(
        self,
        current_user: UserModel,
        query: str,
        complex_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[dict]:
        """Search announcements by title or description."""
        logger.info(f"User {current_user.username} searching announcements with query: {query}")
        
        if current_user.role == UserRole.ADMIN:
            announcements = self.announcement_repo.search_announcements_admin(query, complex_id, skip, limit)
        else:
            assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
            if current_user.role == UserRole.SITE_RESIDENT:
                building_complex_ids = [b.complex_id for b in current_user.assigned_buildings]
                assigned_complex_ids = list(set(assigned_complex_ids + building_complex_ids))
            
            if complex_id:
                if complex_id not in assigned_complex_ids:
                    return []
                search_complex_ids = [complex_id]
            else:
                search_complex_ids = assigned_complex_ids
            
            if not search_complex_ids:
                return []
            
            announcements = self.announcement_repo.search_announcements(query, search_complex_ids, skip, limit)
        
        # Enrich announcements
        result = []
        for a in announcements:
            a_out = self._enrich_announcement(a, current_user)
            result.append(a_out)
        
        return result
    
    # Private helper methods
    def _enrich_announcement(self, announcement: AnnouncementModel, current_user: UserModel = None) -> dict:
        """Enrich announcement with emotion counts, reactions, comments, and read status."""
        emotion_counts = self.announcement_repo.get_emotion_counts(announcement.id)
        reactions = self.announcement_repo.get_user_reactions(announcement.id)
        
        user_reactions = []
        for r in reactions:
            user = self.user_repo.get_by_id(r.user_id)
            if user:
                user_reactions.append(UserReaction(user_id=user.id, username=user.username, emoji=r.emoji))
        
        a_out = AnnouncementOut.from_orm(announcement)
        a_out.emotion_counts = [EmotionCount(emoji=e.emoji, count=e.count) for e in emotion_counts]
        a_out.user_reactions = user_reactions
        a_out.comments = self._get_comment_tree(announcement.id)
        
        # Read status
        if current_user:
            read_entry = self.read_repo.get_by_announcement_and_user(announcement.id, current_user.id)
            a_out.is_read = read_entry is not None
            
            # Staff can see counts
            if current_user.role in [UserRole.ADMIN, UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
                reads = self.read_repo.get_reads_by_announcement(announcement.id)
                a_out.read_count = len(reads)
                
                complex_obj = self.complex_repo.get_by_id(announcement.complex_id)
                if complex_obj:
                    a_out.unread_count = len(complex_obj.assigned_users) - a_out.read_count
        
        return a_out
    
    def _get_comment_tree(self, announcement_id: int, parent_id: int = None) -> List[CommentOut]:
        """Recursively build comment tree."""
        comments = self.announcement_repo.get_comments_by_announcement(announcement_id, parent_id)
        
        result = []
        for c in comments:
            emotion_counts = self.announcement_repo.get_comment_emotion_counts(c.id)
            creator = self.user_repo.get_by_id(c.created_by)
            
            c_out = CommentOut(
                id=c.id,
                content=c.content,
                announcement_id=c.announcement_id,
                parent_id=c.parent_id,
                created_date=c.created_date,
                created_by=c.created_by,
                username=creator.username if creator else "Unknown",
                emotion_counts=[EmotionCount(emoji=e.emoji, count=e.count) for e in emotion_counts],
                replies=self._get_comment_tree(announcement_id, c.id)
            )
            result.append(c_out)
        return result
    
    def _validate_create_permission(self, current_user: UserModel, complex_obj):
        """Validate if current user can create announcements in the complex."""
        if current_user.role not in [UserRole.ADMIN, UserRole.SITE_MANAGER]:
            logger.warning(f"Unauthorized announcement creation attempt by {current_user.username}")
            raise HTTPException(status_code=403, detail="Only admins and site managers can create announcements")
        
        if current_user.role == UserRole.SITE_MANAGER:
            if complex_obj not in current_user.assigned_complexes:
                logger.warning(f"Unauthorized announcement creation attempt by manager {current_user.username} for complex ID {complex_obj.id}")
                raise HTTPException(status_code=403, detail="You can only create announcements for your assigned complexes")
    
    def _validate_modify_permission(self, current_user: UserModel, announcement: AnnouncementModel):
        """Validate if current user can modify the announcement."""
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.role == UserRole.SITE_MANAGER:
            if announcement.complex_id in [c.id for c in current_user.assigned_complexes]:
                return
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    def _validate_access_permission(self, current_user: UserModel, announcement: AnnouncementModel):
        """Validate if current user can access the announcement."""
        if current_user.role == UserRole.ADMIN:
            return
        assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
        if announcement.complex_id in assigned_complex_ids:
            return
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    def _validate_comment_delete_permission(self, current_user: UserModel, comment: CommentModel):
        """Validate if current user can delete the comment."""
        if comment.created_by == current_user.id:
            return
        if current_user.role == UserRole.ADMIN:
            return
        if current_user.role == UserRole.SITE_MANAGER:
            announcement = self.announcement_repo.get_by_id(comment.announcement_id)
            if announcement and announcement.complex_id in [c.id for c in current_user.assigned_complexes]:
                return
        
        raise HTTPException(status_code=403, detail="Not enough permissions")
