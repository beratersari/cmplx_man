from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from app.infrastructure.database import get_db
from app.infrastructure.models import ResidentialComplexModel, UserModel, BuildingModel
from app.domain.entities import UserRole
from app.interfaces.api.deps import get_current_user, RoleChecker
from app.infrastructure.logging_config import logger
from .schemas import ResidentialComplexCreate, ResidentialComplexOut, ComplexAssignment, UserOut

router = APIRouter()

# Access: Admins only.
@router.post("/", response_model=ResidentialComplexOut, summary="Create Residential Complex", description="Creates a new residential complex. Restricted to Admins only.")
def create_complex(
    complex_in: ResidentialComplexCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    logger.info(f"Admin {current_user.username} (ID: {current_user.id}) creating complex: {complex_in.name}")
    # Check if name already exists to avoid IntegrityError
    existing = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.name == complex_in.name).first()
    if existing:
        logger.warning(f"Complex creation failed: {complex_in.name} already exists")
        raise HTTPException(status_code=400, detail="Residential complex with this name already exists")

    new_complex = ResidentialComplexModel(
        name=complex_in.name,
        address=complex_in.address,
        created_by=current_user.id
    )
    db.add(new_complex)
    db.commit()
    db.refresh(new_complex)
    logger.info(f"Complex created successfully: {new_complex.name} (ID: {new_complex.id})")
    return new_complex

# Access: Admins see all complexes; others see assigned complexes.
@router.get("/", response_model=List[ResidentialComplexOut], summary="List Residential Complexes", description="Retrieves a list of residential complexes. Admins can see all complexes. Managers and attendants can only see the complexes they are assigned to.")
def read_complexes(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching complexes")
    if current_user.role == UserRole.ADMIN:
        return db.query(ResidentialComplexModel).offset(skip).limit(limit).all()
    else:
        # Managers and attendants can see complexes they are assigned to
        return current_user.assigned_complexes[skip:skip + limit]

# Access: Admins or managers assigned to the complex.
@router.post("/assign", summary="Assign User to Complex", description="Assigns a user to a residential complex. Restricted to Admins or Site Managers who are already assigned to the target complex. Admins cannot be assigned to complexes.")
def assign_user_to_complex(
    assignment: ComplexAssignment,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) assigning user ID {assignment.user_id} to complex ID {assignment.complex_id}")
    # Only Admin or a Manager of this site can assign others
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == assignment.complex_id).first()
    if not complex_obj:
        logger.error(f"Assignment failed: Complex ID {assignment.complex_id} not found")
        raise HTTPException(status_code=404, detail="Complex not found")
    
    if current_user.role != UserRole.ADMIN:
        if complex_obj not in current_user.assigned_complexes:
             logger.warning(f"Unauthorized assignment attempt by {current_user.username} for complex ID {assignment.complex_id}")
             raise HTTPException(status_code=403, detail="Not enough permissions")
        if current_user.role != UserRole.SITE_MANAGER:
             logger.warning(f"Unauthorized assignment attempt by {current_user.username} (not a manager)")
             raise HTTPException(status_code=403, detail="Only managers can assign users")

    target_user = db.query(UserModel).filter(UserModel.id == assignment.user_id).first()
    if not target_user:
        logger.error(f"Assignment failed: User ID {assignment.user_id} not found")
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.role == UserRole.ADMIN:
        logger.warning(f"Attempt to assign admin ID {assignment.user_id} to complex ID {assignment.complex_id}")
        raise HTTPException(status_code=400, detail="Cannot assign Admin to a complex")

    if current_user.role == UserRole.SITE_MANAGER:
        manager_complex_ids = {c.id for c in current_user.assigned_complexes}
        target_user_complex_ids = {c.id for c in target_user.assigned_complexes}
        if not target_user_complex_ids.intersection(manager_complex_ids):
            logger.warning(
                f"Unauthorized assignment attempt: Manager {current_user.username} cannot assign user ID {assignment.user_id} outside their complexes"
            )
            raise HTTPException(status_code=403, detail="Managers can only assign users already in their complexes")

    if target_user.assigned_complexes and complex_obj not in target_user.assigned_complexes:
        logger.warning(
            f"Assignment failed: User ID {assignment.user_id} already assigned to another complex"
        )
        raise HTTPException(status_code=400, detail="A user can belong to at most one complex")

    if complex_obj not in target_user.assigned_complexes:
        target_user.assigned_complexes.append(complex_obj)
        db.commit()
    
    logger.info(f"User ID {assignment.user_id} assigned successfully to complex ID {assignment.complex_id} by {current_user.username}")
    return {"message": "User assigned successfully"}

# Access: Admins or users assigned to the complex.
@router.get("/{complex_id}/users", response_model=List[UserOut], summary="List Complex Users", description="Retrieves a list of all users (managers, attendants, residents) assigned to a specific residential complex. Restricted to Admins or users already assigned to that complex.")
def read_complex_users(
    complex_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching users for complex ID {complex_id}")
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == complex_id).first()
    if not complex_obj:
        raise HTTPException(status_code=404, detail="Complex not found")

    if current_user.role != UserRole.ADMIN:
        if complex_obj not in current_user.assigned_complexes:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    assigned_users = db.query(UserModel).join(UserModel.assigned_complexes).filter(
        ResidentialComplexModel.id == complex_id
    ).distinct().all()

    resident_users = db.query(UserModel).join(UserModel.assigned_buildings).filter(
        BuildingModel.complex_id == complex_id
    ).distinct().all()

    combined_users = list({user.id: user for user in assigned_users + resident_users}.values())
    return combined_users[skip:skip + limit]

# Access: Admins or managers assigned to the complex.
@router.get("/{complex_id}/users-by-role", summary="List Complex Users Grouped by Role", description="Retrieves all users in a complex grouped by role. Restricted to Admins or Site Managers assigned to the complex.")
def read_complex_users_by_role(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching users by role for complex ID {complex_id}")
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == complex_id).first()
    if not complex_obj:
        raise HTTPException(status_code=404, detail="Complex not found")

    if current_user.role != UserRole.ADMIN:
        if complex_obj not in current_user.assigned_complexes:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if current_user.role != UserRole.SITE_MANAGER:
            raise HTTPException(status_code=403, detail="Only managers can access this view")

    assigned_users = db.query(UserModel).join(UserModel.assigned_complexes).filter(
        ResidentialComplexModel.id == complex_id
    ).distinct().all()

    resident_users = db.query(UserModel).join(UserModel.assigned_buildings).filter(
        BuildingModel.complex_id == complex_id
    ).distinct().all()

    combined_users = list({user.id: user for user in assigned_users + resident_users}.values())
    users_by_role: Dict[str, List[UserOut]] = {}
    for user in combined_users:
        role_key = user.role.value
        users_by_role.setdefault(role_key, []).append(UserOut.from_orm(user))

    return users_by_role

# Access: Admins or managers assigned to the complex.
@router.put("/{complex_id}", response_model=ResidentialComplexOut, summary="Update Residential Complex", description="Updates a residential complex's details. Restricted to Admins or Site Managers assigned to the complex.")
def update_complex(
    complex_id: int,
    complex_in: ResidentialComplexCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) updating complex ID {complex_id}")
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == complex_id).first()
    if not complex_obj:
        logger.error(f"Update failed: Complex ID {complex_id} not found")
        raise HTTPException(status_code=404, detail="Complex not found")
    
    # Authorization
    if current_user.role != UserRole.ADMIN:
        if complex_obj not in current_user.assigned_complexes:
            logger.warning(f"Unauthorized update attempt by {current_user.username} for complex ID {complex_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized update attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only managers can update complexes")
    
    # Check if name already exists
    existing = db.query(ResidentialComplexModel).filter(
        ResidentialComplexModel.name == complex_in.name,
        ResidentialComplexModel.id != complex_id
    ).first()
    if existing:
        logger.warning(f"Update failed: Complex name {complex_in.name} already exists")
        raise HTTPException(status_code=400, detail="Residential complex with this name already exists")

    complex_obj.name = complex_in.name
    complex_obj.address = complex_in.address
    complex_obj.updated_by = current_user.id
    
    db.commit()
    db.refresh(complex_obj)
    logger.info(f"Complex ID {complex_id} updated successfully by {current_user.username}")
    return complex_obj

# Access: Admins only.
@router.delete("/{complex_id}", summary="Delete Residential Complex", description="Deletes a residential complex. Restricted to Admins only.")
def delete_complex(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    logger.info(f"Admin {current_user.username} (ID: {current_user.id}) deleting complex ID {complex_id}")
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == complex_id).first()
    if not complex_obj:
        logger.error(f"Deletion failed: Complex ID {complex_id} not found")
        raise HTTPException(status_code=404, detail="Complex not found")
    
    db.delete(complex_obj)
    db.commit()
    logger.info(f"Complex ID {complex_id} deleted successfully by {current_user.username}")
    return {"message": "Residential complex deleted successfully"}
