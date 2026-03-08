from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import UserModel
from app.api.deps import get_current_user
from app.services import AnnouncementService
from .schemas import (
    AnnouncementCreate, 
    AnnouncementOut, 
    EmotionCreate, 
    CommentCreate, 
    ReplyCreate,
    CommentOut,
    UserReaction,
    AnnouncementReadStats
)

router = APIRouter()


@router.post("/", response_model=AnnouncementOut, summary="Create Announcement")
def create_announcement(
    announcement_in: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Create a new announcement."""
    service = AnnouncementService(db)
    return service.create_announcement(announcement_in, current_user)


@router.get("/", response_model=List[AnnouncementOut], summary="List Announcements", description="Retrieves a list of announcements. Admins can see all announcements. Other users can only see announcements for the complexes they are assigned to. Can be filtered by complex_id.")
def read_announcements(
    complex_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List announcements."""
    service = AnnouncementService(db)
    return service.list_announcements(current_user, complex_id, skip, limit)


@router.get("/search", response_model=List[AnnouncementOut], summary="Search Announcements", description="Search announcements by title or description. Admins can search all announcements. Other users can only search within their assigned complexes.")
def search_announcements(
    query: str = Query(..., min_length=1, description="Search query for title or description"),
    complex_id: Optional[int] = Query(None, description="Filter by complex ID (optional for admins)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Search announcements by title or description."""
    service = AnnouncementService(db)
    return service.search_announcements(current_user, query, complex_id, skip, limit)


@router.get("/{announcement_id}", response_model=AnnouncementOut, summary="Get Announcement", description="Get a specific announcement by ID. Marks the announcement as read for the current user.")
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get an announcement by ID and mark it as read."""
    service = AnnouncementService(db)
    return service.get_announcement_by_id(announcement_id, current_user)


@router.get("/{announcement_id}/read-stats", response_model=AnnouncementReadStats, summary="Get Announcement Read Stats", description="Retrieves statistics about who has read the announcement. Restricted to staff.")
def get_announcement_read_stats(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get read statistics for an announcement."""
    service = AnnouncementService(db)
    return service.get_read_stats(announcement_id, current_user)


@router.post("/{announcement_id}/emotions", summary="React to Announcement", description="Adds or updates an emoji reaction to an announcement. Restricted to users assigned to the announcement's complex.")
def react_to_announcement(
    announcement_id: int,
    emotion_in: EmotionCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Add or update a reaction to an announcement."""
    service = AnnouncementService(db)
    return service.react_to_announcement(announcement_id, emotion_in, current_user)


@router.get("/{announcement_id}/reactions", response_model=List[UserReaction], summary="Get Announcement Reactions", description="Retrieves a list of users and their emoji reactions for a specific announcement. Restricted to users who have access to the announcement's complex.")
def get_announcement_reactions(
    announcement_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get all reactions for an announcement."""
    service = AnnouncementService(db)
    return service.get_announcement_reactions(announcement_id, current_user, skip, limit)


@router.put("/{announcement_id}", response_model=AnnouncementOut, summary="Update Announcement", description="Updates an announcement's details. Restricted to Admins or Site Managers assigned to the announcement's complex.")
def update_announcement(
    announcement_id: int,
    announcement_in: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Update an announcement."""
    service = AnnouncementService(db)
    return service.update_announcement(announcement_id, announcement_in, current_user)


@router.delete("/{announcement_id}", summary="Delete Announcement", description="Deletes an announcement. Restricted to Admins or Site Managers assigned to the announcement's complex.")
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Delete an announcement."""
    service = AnnouncementService(db)
    return service.delete_announcement(announcement_id, current_user)


@router.post("/{announcement_id}/comments", response_model=CommentOut, summary="Create Comment", description="Creates a new top-level comment on an announcement. Restricted to Admins or users assigned to the announcement's complex. Comments must be enabled for the announcement.")
def create_comment(
    announcement_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Create a top-level comment on an announcement."""
    service = AnnouncementService(db)
    return service.create_comment(announcement_id, comment_in, current_user)


@router.post("/{announcement_id}/replies", response_model=CommentOut, summary="Create Reply", description="Creates a reply to a comment on an announcement. Restricted to Admins or users assigned to the announcement's complex. Comments must be enabled for the announcement.")
def create_reply(
    announcement_id: int,
    reply_in: ReplyCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Create a reply to a comment on an announcement."""
    service = AnnouncementService(db)
    return service.create_reply(announcement_id, reply_in, current_user)


@router.post("/comments/{comment_id}/emotions", summary="React to Comment", description="Adds or updates an emoji reaction to a comment.")
def react_to_comment(
    comment_id: int,
    emotion_in: EmotionCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Add or update a reaction to a comment."""
    service = AnnouncementService(db)
    return service.react_to_comment(comment_id, emotion_in, current_user)


@router.get("/comments/{comment_id}/reactions", response_model=List[UserReaction], summary="Get Comment Reactions", description="Retrieves a list of users and their emoji reactions for a specific comment.")
def get_comment_reactions(
    comment_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Get all reactions for a comment."""
    service = AnnouncementService(db)
    return service.get_comment_reactions(comment_id, skip, limit)


@router.put("/comments/{comment_id}", response_model=CommentOut, summary="Update Comment", description="Updates a comment's content. Restricted to the user who created the comment.")
def update_comment(
    comment_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Update a comment."""
    service = AnnouncementService(db)
    return service.update_comment(comment_id, comment_in, current_user)


@router.delete("/comments/{comment_id}", summary="Delete Comment", description="Deletes a comment. Restricted to the comment creator, Admins, or Site Managers assigned to the announcement's complex.")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Delete a comment."""
    service = AnnouncementService(db)
    return service.delete_comment(comment_id, current_user)


@router.delete("/{announcement_id}/emotions", summary="Remove Announcement Reaction", description="Removes a user's emoji reaction from an announcement. Restricted to Admins or the user who reacted.")
def remove_announcement_reaction(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Remove a reaction from an announcement."""
    service = AnnouncementService(db)
    return service.remove_announcement_reaction(announcement_id, current_user)


@router.delete("/comments/{comment_id}/emotions", summary="Remove Comment Reaction", description="Removes a user's emoji reaction from a comment. Restricted to Admins or the user who reacted.")
def remove_comment_reaction(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Remove a reaction from a comment."""
    service = AnnouncementService(db)
    return service.remove_comment_reaction(comment_id, current_user)
