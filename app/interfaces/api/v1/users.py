from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.infrastructure.models import UserModel, BuildingModel, ResidentialComplexModel
from app.infrastructure.security import get_password_hash
from app.domain.entities import UserRole
from app.interfaces.api.deps import get_current_user, RoleChecker, validate_unique_user
from app.infrastructure.logging_config import logger
from .schemas import UserCreate, UserOut, UserUpdate

router = APIRouter()

# Access: Admins can create any user. Site managers can create non-admin users.
@router.post("/", response_model=UserOut, summary="Create User", description="Creates a new user. Admins can create any role. Site managers can create any role except ADMIN, and created users are automatically assigned to the manager's complexes.")
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) is creating a new user: {user_in.username}")
    # Authorization checks
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.SITE_MANAGER:
        if user_in.role == UserRole.ADMIN:
            logger.warning(f"Unauthorized admin creation attempt by {current_user.username}")
            raise HTTPException(status_code=403, detail="Site managers cannot create admins")
    else:
        logger.warning(f"Unauthorized user creation attempt by {current_user.username}")
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

    if current_user.role == UserRole.SITE_MANAGER:
        new_user.assigned_complexes = list(current_user.assigned_complexes)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"User created successfully: {new_user.username} (ID: {new_user.id})")
    return new_user

# Access: Any authenticated user.
@router.get("/me", response_model=UserOut, summary="Get Current User", description="Retrieves the profile information of the currently authenticated user.")
def read_user_me(current_user: UserModel = Depends(get_current_user)):
    logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching their own profile")
    return current_user

# Access: Admins see all users; others see only themselves.
@router.get("/", response_model=List[UserOut], summary="List Users", description="Retrieves a list of users. Admins can see all users in the system. Other users can only see their own profile in this list.")
def read_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) listing users")
    if current_user.role == UserRole.ADMIN:
        return db.query(UserModel).offset(skip).limit(limit).all()
    else:
        return [current_user]

# Access: Admins can update any user. Users can update their own profile.
@router.put("/{user_id}", response_model=UserOut, summary="Update User", description="Updates a user's information. Admins can update any user. Site managers can update users who belong to their assigned complexes. Users can update their own profile.")
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) updating user ID: {user_id}")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        logger.error(f"User update failed: User ID {user_id} not found")
        raise HTTPException(status_code=404, detail="User not found")
    
    # Authorization
    if current_user.role == UserRole.ADMIN or current_user.id == user_id:
        pass
    elif current_user.role == UserRole.SITE_MANAGER:
        # Check if the user being edited belongs to any complex the manager is assigned to
        manager_complex_ids = {c.id for c in current_user.assigned_complexes}
        user_complex_ids = {c.id for c in user.assigned_complexes}
        # Also check buildings
        user_building_complex_ids = {b.complex_id for b in user.assigned_buildings}
        
        all_user_related_complex_ids = user_complex_ids.union(user_building_complex_ids)
        
        if not manager_complex_ids.intersection(all_user_related_complex_ids):
            logger.warning(f"Unauthorized update attempt on user ID {user_id} by manager {current_user.username}")
            raise HTTPException(status_code=403, detail="Managers can only edit users in their complexes")
    else:
        logger.warning(f"Unauthorized update attempt on user ID {user_id} by {current_user.username}")
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

    if user_in.complex_ids is not None:
        complexes = db.query(ResidentialComplexModel).filter(
            ResidentialComplexModel.id.in_(user_in.complex_ids)
        ).all()
        if len(complexes) != len(set(user_in.complex_ids)):
            raise HTTPException(status_code=404, detail="One or more complexes not found")
        user.assigned_complexes = complexes

    if user_in.building_ids is not None:
        buildings = db.query(BuildingModel).filter(
            BuildingModel.id.in_(user_in.building_ids)
        ).all()
        if len(buildings) != len(set(user_in.building_ids)):
            raise HTTPException(status_code=404, detail="One or more buildings not found")
        user.assigned_buildings = buildings

    user.updated_by = current_user.id
    db.commit()
    db.refresh(user)
    logger.info(f"User ID {user_id} updated successfully by {current_user.username}")
    return user

# Access: Admins only.
@router.delete("/{user_id}", summary="Delete User", description="Deletes a user from the system. This action is restricted to Admins only. The super admin 'admin' cannot be deleted.")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    logger.info(f"Admin {current_user.username} (ID: {current_user.id}) deleting user ID: {user_id}")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        logger.error(f"User deletion failed: User ID {user_id} not found")
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.username == "admin":
        logger.critical(f"Attempt to delete super admin by {current_user.username}")
        raise HTTPException(status_code=400, detail="Cannot delete super admin")

    db.delete(user)
    db.commit()
    logger.info(f"User ID {user_id} deleted successfully by {current_user.username}")
    return {"message": "User deleted successfully"}
