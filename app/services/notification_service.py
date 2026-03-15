from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import NotificationModel, NotificationType
from app.repositories.notification_repository import NotificationRepository


class NotificationService:
    """Service for notification-related business logic."""

    def __init__(self, db: Session):
        self.db = db
        self.notification_repo = NotificationRepository(db)

    def get_user_notifications(
        self, user_id: int, skip: int = 0, limit: int = 20, unread_only: bool = False
    ) -> List[NotificationModel]:
        """Get notifications for a user."""
        return self.notification_repo.get_user_notifications(user_id, skip, limit, unread_only)

    def mark_as_read(self, notification_id: int, user_id: int) -> NotificationModel:
        """Mark a notification as read."""
        return self.notification_repo.mark_as_read(notification_id, user_id)

    def mark_all_as_read(self, user_id: int) -> None:
        """Mark all notifications as read for a user."""
        self.notification_repo.mark_all_as_read(user_id)

    def update_preferences(self, user_id: int, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Update user's notification preferences."""
        from app.repositories import UserRepository
        user_repo = UserRepository(self.db)
        user = user_repo.get_by_id(user_id)
        
        if "push_notifications_enabled" in preferences:
            user.push_notifications_enabled = preferences["push_notifications_enabled"]
        if "email_notifications_enabled" in preferences:
            user.email_notifications_enabled = preferences["email_notifications_enabled"]
        if "payment_reminder_days" in preferences:
            user.payment_reminder_days = preferences["payment_reminder_days"]
        
        self.db.commit()
        self.db.refresh(user)
        
        return {
            "push_notifications_enabled": user.push_notifications_enabled,
            "email_notifications_enabled": user.email_notifications_enabled,
            "payment_reminder_days": user.payment_reminder_days
        }

    def create_notification(
        self, user_id: int, notification_type: str, title: str,
        message: Optional[str] = None, data: Optional[str] = None,
        scheduled_at: Optional[datetime] = None
    ) -> NotificationModel:
        """Create a new notification."""
        return self.notification_repo.create(
            user_id, notification_type, title, message, data, scheduled_at
        )

    def create_payment_reminder(self, user_id: int, payment_title: str, amount: float,
                                due_date: datetime, days_before: int = 3) -> NotificationModel:
        """Create a payment reminder notification."""
        from datetime import timedelta
        reminder_date = due_date - timedelta(days=days_before)
        
        return self.create_notification(
            user_id=user_id,
            notification_type=NotificationType.PAYMENT_REMINDER,
            title=f"Payment Reminder: {payment_title}",
            message=f"Your payment of ${amount:.2f} for {payment_title} is due on {due_date.strftime('%Y-%m-%d')}.",
            scheduled_at=reminder_date
        )

    def create_payment_created_notification(self, user_id: int, payment_title: str,
                                            amount: float, due_date: datetime) -> NotificationModel:
        """Create a notification when a new payment is created."""
        return self.create_notification(
            user_id=user_id,
            notification_type=NotificationType.PAYMENT_CREATED,
            title=f"New Payment: {payment_title}",
            message=f"A new payment of ${amount:.2f} for {payment_title} has been created. Due: {due_date.strftime('%Y-%m-%d')}.",
        )
