from typing import Optional
from sqlalchemy.orm import Session

from app.repositories import UserRepository
from app.models.models import UserModel
from app.core.security import verify_password, create_access_token


class AuthService:
    """Service for authentication-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
    
    def authenticate_user(self, username: str, password: str) -> Optional[UserModel]:
        """Authenticate a user by username and password."""
        user = self.user_repo.get_by_username(username)
        if not user or not user.is_active:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    def create_token(self, user: UserModel) -> str:
        """Create a JWT access token for the user."""
        return create_access_token(data={"sub": user.username, "role": user.role.value, "id": user.id})
    
    def get_user_by_username(self, username: str) -> Optional[UserModel]:
        """Get user by username."""
        return self.user_repo.get_by_username(username)
