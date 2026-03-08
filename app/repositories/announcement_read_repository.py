from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.models import AnnouncementReadModel, UserModel
from .base_repository import BaseRepository

class AnnouncementReadRepository(BaseRepository[AnnouncementReadModel]):
    def __init__(self, db: Session):
        super().__init__(db, AnnouncementReadModel)

    def get_by_announcement_and_user(self, announcement_id: int, user_id: int) -> Optional[AnnouncementReadModel]:
        return self.db.query(AnnouncementReadModel).filter(
            AnnouncementReadModel.announcement_id == announcement_id,
            AnnouncementReadModel.user_id == user_id
        ).first()

    def get_reads_by_announcement(self, announcement_id: int) -> List[AnnouncementReadModel]:
        return self.db.query(AnnouncementReadModel).filter(
            AnnouncementReadModel.announcement_id == announcement_id
        ).all()

    def get_read_user_ids(self, announcement_id: int) -> List[int]:
        results = self.db.query(AnnouncementReadModel.user_id).filter(
            AnnouncementReadModel.announcement_id == announcement_id
        ).all()
        return [r[0] for r in results]
