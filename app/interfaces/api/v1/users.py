from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.infrastructure.models import UserModel, BuildingModel
from app.infrastructure.security import get_password_hash
from app.domain.entities import UserRole
from app.interfaces.api.deps import get_current_user, RoleChecker, validate_unique_user
from .schemas import UserCreate, UserOut, UserUpdate

router = APIRouter()

@router.post("/", response_model=UserOut)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Authorization checks
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.SITE_MANAGER:
        if user_in.role == UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Site managers cannot create admins")
    else:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Check if user exists by username and email
    validate_unique_user(db, username=user_in.username, email=user_in.email)

    new_user = UserModel(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=user_in.is_active,
        contact=user_in.contact,
        description=user_in.description,
        created_by=current_user.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/me", response_model=UserOut)
def read_user_me(current_user: UserModel = Depends(get_current_user)):
    return current_user

@router.get("/", response_model=List[UserOut])
def read_users(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role == UserRole.ADMIN:
        return db.query(UserModel).all()
    else:
        return [current_user]

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Authorization
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if user_in.email:
        validate_unique_user(db, email=user_in.email, exclude_user_id=user_id)
        user.email = user_in.email
    
    if user_in.role and current_user.role == UserRole.ADMIN:
        user.role = user_in.role
    
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)
    
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    
    if user_in.contact is not None:
        user.contact = user_in.contact
    
    if user_in.description is not None:
        user.description = user_in.description

    user.updated_by = current_user.id
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete super admin")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
