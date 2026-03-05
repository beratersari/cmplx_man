from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.infrastructure.models import BuildingModel, ResidentialComplexModel, UserModel
from app.domain.entities import UserRole
from app.interfaces.api.deps import get_current_user
from .schemas import BuildingCreate, BuildingOut, BuildingAssignment, UserOut

router = APIRouter()

@router.post("/", response_model=BuildingOut)
def create_building(
    building_in: BuildingCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Check complex exists
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == building_in.complex_id).first()
    if not complex_obj:
        raise HTTPException(status_code=404, detail="Residential complex not found")

    # Authorization
    if current_user.role != UserRole.ADMIN:
        if complex_obj not in current_user.assigned_complexes:
            raise HTTPException(status_code=403, detail="Not enough permissions for this complex")
        if current_user.role != UserRole.SITE_MANAGER:
            raise HTTPException(status_code=403, detail="Only managers or admins can create buildings")

    existing = db.query(BuildingModel).filter(
        BuildingModel.name == building_in.name,
        BuildingModel.complex_id == building_in.complex_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Building already exists in this complex")

    new_building = BuildingModel(
        name=building_in.name,
        complex_id=building_in.complex_id,
        created_by=current_user.id
    )
    db.add(new_building)
    db.commit()
    db.refresh(new_building)
    return new_building

@router.post("/assign")
def assign_resident(
    assignment: BuildingAssignment,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    building = db.query(BuildingModel).filter(BuildingModel.id == assignment.building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    user = db.query(UserModel).filter(UserModel.id == assignment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role != UserRole.SITE_RESIDENT:
        raise HTTPException(status_code=400, detail="Only residents can be assigned to buildings")

    # Authorization: admin or manager assigned to the complex
    if current_user.role != UserRole.ADMIN:
        if building.complex not in current_user.assigned_complexes:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    if user not in building.residents:
        building.residents.append(user)
        db.commit()
    return {"message": "Resident assigned successfully"}

@router.get("/{building_id}/users", response_model=List[UserOut])
def read_building_users(
    building_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    building = db.query(BuildingModel).filter(BuildingModel.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    if current_user.role != UserRole.ADMIN:
        if building.complex not in current_user.assigned_complexes:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    return building.residents

@router.put("/{building_id}", response_model=BuildingOut)
def update_building(
    building_id: int,
    building_in: BuildingCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    building = db.query(BuildingModel).filter(BuildingModel.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    # Authorization
    if current_user.role != UserRole.ADMIN:
        if building.complex not in current_user.assigned_complexes:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if current_user.role != UserRole.SITE_MANAGER:
            raise HTTPException(status_code=403, detail="Only managers can update buildings")

    # Check if name already exists in same complex
    existing = db.query(BuildingModel).filter(
        BuildingModel.name == building_in.name,
        BuildingModel.complex_id == building_in.complex_id,
        BuildingModel.id != building_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Building with this name already exists in this complex")

    building.name = building_in.name
    building.complex_id = building_in.complex_id
    building.updated_by = current_user.id
    
    db.commit()
    db.refresh(building)
    return building

@router.delete("/{building_id}")
def delete_building(
    building_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    building = db.query(BuildingModel).filter(BuildingModel.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    # Authorization
    if current_user.role != UserRole.ADMIN:
        if building.complex not in current_user.assigned_complexes:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        if current_user.role != UserRole.SITE_MANAGER:
            raise HTTPException(status_code=403, detail="Only managers can delete buildings")

    db.delete(building)
    db.commit()
    return {"message": "Building deleted successfully"}

@router.get("/", response_model=List[BuildingOut])
def read_buildings(
    complex_id: int = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = db.query(BuildingModel)
    if complex_id:
        query = query.filter(BuildingModel.complex_id == complex_id)
    
    buildings = query.all()
    
    if current_user.role == UserRole.ADMIN:
        return buildings
    
    # Filter buildings by complexes user is assigned to
    assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
    return [b for b in buildings if b.complex_id in assigned_complex_ids]
