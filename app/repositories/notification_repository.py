from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import NotificationModel, NotificationType


class NotificationRepository:
    """Repository for notification-related database operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_user_notifications(
        self, user_id: int, skip: int = 0, limit: int = 20, unread_only: bool = False
    ) -> List[NotificationModel]:
        """Get notifications for a user."""
        query = self.db.query(NotificationModel).filter(NotificationModel.user_id == user_id)
        if unread_only:
            query = query.filter(NotificationModel.is_read == False)
        return query.order_by(NotificationModel.created_date.desc()).offset(skip).limit(limit).all()

    def mark_as_read(self, notification_id: int, user_id: int) -> Optional[NotificationModel]:
        """Mark a notification as read."""
        notification = self.db.query(NotificationModel).filter(
            NotificationModel.id == notification_id,
            NotificationModel.user_id == user_id
        ).first()
        if notification:
            notification.is_read = True
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def mark_all_as_read(self, user_id: int) -> None:
        """Mark all notifications as read for a user."""
        self.db.query(NotificationModel).filter(
            NotificationModel.user_id == user_id,
            NotificationModel.is_read == False
        ).update({"is_read": True})
        self.db.commit()

    def create(
        self, user_id: int, notification_type: str, title: str,
        message: Optional[str] = None, data: Optional[str] = None,
        scheduled_at: Optional[datetime] = None
    ) -> NotificationModel:
        """Create a new notification."""
        notification = NotificationModel(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            data=data,
            scheduled_at=scheduled_at
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_pending_reminders(self) -> List[NotificationModel]:
        """Get scheduled reminders that are due."""
        now = datetime.utcnow()
        return self.db.query(NotificationModel).filter(
            NotificationModel.scheduled_at <= now,
            NotificationModel.sent_at.is_(None)
        ).all()
