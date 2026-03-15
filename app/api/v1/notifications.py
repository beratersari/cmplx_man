from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import UserModel
from app.api.deps import get_current_user
from app.services import NotificationService
from .schemas import NotificationOut, NotificationPreferenceUpdate

router = APIRouter()


@router.get("/", response_model=List[NotificationOut], summary="Get My Notifications")
def get_my_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's notifications."""
    service = NotificationService(db)
    return service.get_user_notifications(current_user.id, skip, limit, unread_only)


@router.put("/{notification_id}/read", response_model=NotificationOut, summary="Mark Notification as Read")
def mark_notification_read(
    notification_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read."""
    service = NotificationService(db)
    return service.mark_as_read(notification_id, current_user.id)


@router.put("/read-all", summary="Mark All Notifications as Read")
def mark_all_notifications_read(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read."""
    service = NotificationService(db)
    service.mark_all_as_read(current_user.id)
    return {"message": "All notifications marked as read"}


@router.put("/preferences", summary="Update Notification Preferences")
def update_notification_preferences(
    preferences: NotificationPreferenceUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's notification preferences."""
    service = NotificationService(db)
    return service.update_preferences(current_user.id, preferences.dict(exclude_none=True))


@router.get("/preferences", summary="Get Notification Preferences")
def get_notification_preferences(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notification preferences."""
    return {
        "push_notifications_enabled": current_user.push_notifications_enabled,
        "email_notifications_enabled": current_user.email_notifications_enabled,
        "payment_reminder_days": current_user.payment_reminder_days
    }
