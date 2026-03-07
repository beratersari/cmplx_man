from datetime import date, datetime
from typing import List
from sqlalchemy.orm import Session

from app.models.models import VisitorModel
from .base_repository import BaseRepository


class VisitorRepository(BaseRepository[VisitorModel]):
    """Repository for visitor entity operations."""

    def __init__(self, db: Session):
        super().__init__(db, VisitorModel)

    def get_visitors_by_date(
        self,
        complex_id: int,
        visit_date: date,
    ) -> List[VisitorModel]:
        """Get visitors for a complex on a specific date."""
        start = datetime.combine(visit_date, datetime.min.time())
        end = datetime.combine(visit_date, datetime.max.time())
        return (
            self.db.query(VisitorModel)
            .filter(
                VisitorModel.complex_id == complex_id,
                VisitorModel.visit_date >= start,
                VisitorModel.visit_date <= end,
            )
            .order_by(VisitorModel.visit_date.desc())
            .all()
        )

    def get_recent_visitors_for_complex(
        self,
        complex_id: int,
        since: datetime,
    ) -> List[VisitorModel]:
        """Get visitors for a complex since a datetime."""
        return (
            self.db.query(VisitorModel)
            .filter(
                VisitorModel.complex_id == complex_id,
                VisitorModel.visit_date >= since,
            )
            .order_by(VisitorModel.visit_date.desc())
            .all()
        )

    def get_recent_visitors_for_user(
        self,
        user_id: int,
        since: datetime,
    ) -> List[VisitorModel]:
        """Get visitors registered by a user since a datetime."""
        return (
            self.db.query(VisitorModel)
            .filter(
                VisitorModel.user_id == user_id,
                VisitorModel.visit_date >= since,
            )
            .order_by(VisitorModel.visit_date.desc())
            .all()
        )
