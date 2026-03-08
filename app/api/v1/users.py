from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import UserModel
from app.core.entities import UserRole
from app.api.deps import get_current_user, RoleChecker
from app.services import UserService
from .schemas import UserCreate, UserOut, UserUpdate

router = APIRouter()


@router.post("/", response_model=UserOut, summary="Create User", description="Creates a new user. Admins can create any role. Site managers can create any role except ADMIN, and created users are automatically assigned to the manager's complexes.")
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Create a new user."""
    service = UserService(db)
    return service.create_user(user_in, current_user)


@router.get("/me", response_model=UserOut, summary="Get Current User", description="Retrieves the profile information of the currently authenticated user.")
def read_user_me(current_user: UserModel = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.get("/", response_model=List[UserOut], summary="List Users", description="Retrieves a list of users. Admins can see all users in the system. Other users can only see their own profile in this list.")
def read_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List users."""
    service = UserService(db)
    return service.list_users(current_user, skip, limit)


@router.get("/search", response_model=List[UserOut], summary="Search Users", description="Search users by username, email, unit_number, or contact. Admins can search all users. Managers can search within their complexes.")
def search_users(
    query: str = Query(..., min_length=1, description="Search query for username, email, unit_number, or contact"),
    complex_id: Optional[int] = Query(None, description="Filter by complex ID (optional for admins)"),
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Search users by username, email, unit_number, or contact."""
    service = UserService(db)
    return service.search_users(current_user, query, complex_id, role, skip, limit)


@router.put("/{user_id}", response_model=UserOut, summary="Update User", description="Updates a user's information. Admins can update any user. Site managers can update users who belong to their assigned complexes. Users can update their own profile.")
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Update a user."""
    service = UserService(db)
    return service.update_user(user_id, user_in, current_user)


@router.delete("/{user_id}", summary="Delete User", description="Deletes a user from the system. This action is restricted to Admins only. The super admin 'admin' cannot be deleted.")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    """Delete a user (admin only)."""
    service = UserService(db)
    return service.delete_user(user_id, current_user)
