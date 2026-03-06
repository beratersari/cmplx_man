from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.infrastructure.models import BuildingModel, ResidentialComplexModel, UserModel
from app.domain.entities import UserRole
from app.interfaces.api.deps import get_current_user
from app.infrastructure.logging_config import logger
from .schemas import BuildingCreate, BuildingOut, BuildingAssignment, UserOut

router = APIRouter()

# Access: Admins or managers assigned to the complex.
@router.post("/", response_model=BuildingOut, summary="Create Building", description="Creates a new building within a residential complex. Restricted to Admins or Site Managers assigned to the target complex.")
def create_building(
    building_in: BuildingCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) creating building: {building_in.name} for complex ID {building_in.complex_id}")
    # Check complex exists
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == building_in.complex_id).first()
    if not complex_obj:
        logger.error(f"Building creation failed: Complex ID {building_in.complex_id} not found")
        raise HTTPException(status_code=404, detail="Residential complex not found")

    # Authorization
    if current_user.role != UserRole.ADMIN:
        if complex_obj not in current_user.assigned_complexes:
            logger.warning(f"Unauthorized building creation attempt by {current_user.username} for complex ID {building_in.complex_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions for this complex")
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized building creation attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only managers or admins can create buildings")

    existing = db.query(BuildingModel).filter(
        BuildingModel.name == building_in.name,
        BuildingModel.complex_id == building_in.complex_id
    ).first()
    if existing:
        logger.warning(f"Building creation failed: {building_in.name} already exists in complex ID {building_in.complex_id}")
        raise HTTPException(status_code=400, detail="Building already exists in this complex")

    new_building = BuildingModel(
        name=building_in.name,
        complex_id=building_in.complex_id,
        created_by=current_user.id
    )
    db.add(new_building)
    db.commit()
    db.refresh(new_building)
    logger.info(f"Building created successfully: {new_building.name} (ID: {new_building.id})")
    return new_building

# Access: Admins or managers assigned to the building's complex.
@router.post("/assign", summary="Assign Resident to Building", description="Assigns a user to a building. Restricted to Admins or Site Managers assigned to the building's complex. The user must already be assigned to the building's complex. A user can belong to at most one building.")
def assign_resident(
    assignment: BuildingAssignment,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) assigning resident ID {assignment.user_id} to building ID {assignment.building_id}")
    building = db.query(BuildingModel).filter(BuildingModel.id == assignment.building_id).first()
    if not building:
        logger.error(f"Assignment failed: Building ID {assignment.building_id} not found")
        raise HTTPException(status_code=404, detail="Building not found")

    user = db.query(UserModel).filter(UserModel.id == assignment.user_id).first()
    if not user:
        logger.error(f"Assignment failed: User ID {assignment.user_id} not found")
        raise HTTPException(status_code=404, detail="User not found")

    # Authorization: admin or manager assigned to the complex
    if current_user.role != UserRole.ADMIN:
        if building.complex not in current_user.assigned_complexes:
            logger.warning(f"Unauthorized assignment attempt by {current_user.username} for building ID {assignment.building_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized assignment attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only managers can assign users to buildings")
        manager_complex_ids = {c.id for c in current_user.assigned_complexes}
        user_complex_ids = {c.id for c in user.assigned_complexes}
        if not user_complex_ids.intersection(manager_complex_ids):
            logger.warning(
                f"Unauthorized assignment attempt: Manager {current_user.username} cannot assign user ID {assignment.user_id} outside their complexes"
            )
            raise HTTPException(status_code=403, detail="Managers can only assign users already in their complexes")

    if building.complex not in user.assigned_complexes:
        logger.warning(
            f"Assignment failed: User ID {assignment.user_id} is not assigned to complex ID {building.complex_id}"
        )
        raise HTTPException(
            status_code=400,
            detail="User must be assigned to the building's complex before building assignment"
        )

    if user.assigned_complexes and building.complex not in user.assigned_complexes:
        logger.warning(
            f"Assignment failed: User ID {assignment.user_id} already assigned to another complex"
        )
        raise HTTPException(status_code=400, detail="A user can belong to at most one complex")

    if user in building.residents:
        return {"message": "User assigned successfully"}

    # Enforce single building limit
    if len(user.assigned_buildings) > 0:
        logger.warning(f"Assignment failed: User ID {user.id} is already assigned to a building")
        raise HTTPException(
            status_code=400,
            detail="A user can belong to at most one building"
        )

    building.residents.append(user)
    db.commit()
    
    logger.info(f"User ID {assignment.user_id} assigned successfully to building ID {assignment.building_id} by {current_user.username}")
    return {"message": "User assigned successfully"}

# Access: Admins or users assigned to the building's complex.
@router.get("/{building_id}/users", response_model=List[UserOut], summary="List Building Users", description="Retrieves a list of all users assigned to a specific building, plus management users of the building's complex. Restricted to Admins or users assigned to the building's complex.")
def read_building_users(
    building_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching users for building ID {building_id}")
    building = db.query(BuildingModel).filter(BuildingModel.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    if current_user.role != UserRole.ADMIN:
        if building.complex not in current_user.assigned_complexes:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    assigned_users = building.residents
    management_users = db.query(UserModel).join(UserModel.assigned_complexes).filter(
        ResidentialComplexModel.id == building.complex_id
    ).distinct().all()

    combined_users = list({user.id: user for user in assigned_users + management_users}.values())
    return combined_users[skip:skip + limit]

# Access: Admins or managers assigned to the building's complex.
@router.put("/{building_id}", response_model=BuildingOut, summary="Update Building", description="Updates a building's details. Restricted to Admins or Site Managers assigned to the building's complex.")
def update_building(
    building_id: int,
    building_in: BuildingCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) updating building ID {building_id}")
    building = db.query(BuildingModel).filter(BuildingModel.id == building_id).first()
    if not building:
        logger.error(f"Update failed: Building ID {building_id} not found")
        raise HTTPException(status_code=404, detail="Building not found")

    # Authorization
    if current_user.role != UserRole.ADMIN:
        if building.complex not in current_user.assigned_complexes:
            logger.warning(f"Unauthorized update attempt by {current_user.username} for building ID {building_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized update attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only managers can update buildings")

    # Check if name already exists in same complex
    existing = db.query(BuildingModel).filter(
        BuildingModel.name == building_in.name,
        BuildingModel.complex_id == building_in.complex_id,
        BuildingModel.id != building_id
    ).first()
    if existing:
        logger.warning(f"Update failed: Building name {building_in.name} already exists in complex ID {building_in.complex_id}")
        raise HTTPException(status_code=400, detail="Building with this name already exists in this complex")

    building.name = building_in.name
    building.complex_id = building_in.complex_id
    building.updated_by = current_user.id
    
    db.commit()
    db.refresh(building)
    logger.info(f"Building ID {building_id} updated successfully by {current_user.username}")
    return building

# Access: Admins or managers assigned to the building's complex.
@router.delete("/{building_id}", summary="Delete Building", description="Deletes a building. Restricted to Admins or Site Managers assigned to the building's complex.")
def delete_building(
    building_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.info(f"User {current_user.username} (ID: {current_user.id}) deleting building ID {building_id}")
    building = db.query(BuildingModel).filter(BuildingModel.id == building_id).first()
    if not building:
        logger.error(f"Deletion failed: Building ID {building_id} not found")
        raise HTTPException(status_code=404, detail="Building not found")

    # Authorization
    if current_user.role != UserRole.ADMIN:
        if building.complex not in current_user.assigned_complexes:
            logger.warning(f"Unauthorized deletion attempt by {current_user.username} for building ID {building_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if current_user.role != UserRole.SITE_MANAGER:
            logger.warning(f"Unauthorized deletion attempt by {current_user.username} (not a manager)")
            raise HTTPException(status_code=403, detail="Only managers can delete buildings")

    db.delete(building)
    db.commit()
    logger.info(f"Building ID {building_id} deleted successfully by {current_user.username}")
    return {"message": "Building deleted successfully"}

# Access: Admins see all buildings; others see buildings for their complexes.
@router.get("/", response_model=List[BuildingOut], summary="List Buildings", description="Retrieves a list of buildings. Admins see all buildings. Other users only see buildings within their assigned complexes. Can be filtered by complex_id.")
def read_buildings(
    complex_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    logger.trace(f"User {current_user.username} (ID: {current_user.id}) fetching buildings")
    query = db.query(BuildingModel)
    if complex_id:
        query = query.filter(BuildingModel.complex_id == complex_id)
    
    buildings = query.offset(skip).limit(limit).all()
    
    if current_user.role == UserRole.ADMIN:
        return buildings
    
    # Filter buildings by complexes user is assigned to
    assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
    filtered = [b for b in buildings if b.complex_id in assigned_complex_ids]
    return filtered
