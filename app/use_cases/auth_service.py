from typing import Optional
from sqlalchemy.orm import Session
from app.infrastructure.models import UserModel
from app.infrastructure.security import verify_password, create_access_token
from app.domain.entities import UserRole

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def authenticate_user(self, username: str, password: str) -> Optional[UserModel]:
        user = self.db.query(UserModel).filter(UserModel.username == username).first()
        if not user or not user.is_active:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create_token(self, user: UserModel) -> str:
        return create_access_token(data={"sub": user.username, "role": user.role.value, "id": user.id})
