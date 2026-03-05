from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.infrastructure.models import UserModel
from app.infrastructure.security import decode_access_token
from app.domain.entities import UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> UserModel:
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def RoleChecker(allowed_roles: list[UserRole]):
    def checker(current_user: UserModel = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return current_user
    return checker

def validate_unique_user(db: Session, username: str = None, email: str = None, exclude_user_id: int = None):
    if username:
        user_query = db.query(UserModel).filter(UserModel.username == username)
        if exclude_user_id:
            user_query = user_query.filter(UserModel.id != exclude_user_id)
        if user_query.first():
            raise HTTPException(status_code=400, detail="Username already exists")
    
    if email:
        email_query = db.query(UserModel).filter(UserModel.email == email)
        if exclude_user_id:
            email_query = email_query.filter(UserModel.id != exclude_user_id)
        if email_query.first():
            raise HTTPException(status_code=400, detail="Email already exists")
