from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.infrastructure.database import get_db
from app.infrastructure.models import ResidentialComplexModel, UserModel, BuildingModel
from app.domain.entities import UserRole
from app.interfaces.api.deps import get_current_user, RoleChecker
from .schemas import ResidentialComplexCreate, ResidentialComplexOut, ComplexAssignment, UserOut

router = APIRouter()

@router.post("/", response_model=ResidentialComplexOut)
def create_complex(
    complex_in: ResidentialComplexCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    # Check if name already exists to avoid IntegrityError
    existing = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.name == complex_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Residential complex with this name already exists")

    new_complex = ResidentialComplexModel(
        name=complex_in.name,
        address=complex_in.address,
        created_by=current_user.id
    )
    db.add(new_complex)
    db.commit()
    db.refresh(new_complex)
    return new_complex

@router.get("/", response_model=List[ResidentialComplexOut])
def read_complexes(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    if current_user.role == UserRole.ADMIN:
        return db.query(ResidentialComplexModel).all()
    else:
        # Managers and attendants can see complexes they are assigned to
        return current_user.assigned_complexes

@router.post("/assign")
def assign_user_to_complex(
    assignment: ComplexAssignment,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Only Admin or a Manager of this site can assign others
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == assignment.complex_id).first()
    if not complex_obj:
        raise HTTPException(status_code=404, detail="Complex not found")
    
    if current_user.role != UserRole.ADMIN:
        if complex_obj not in current_user.assigned_complexes:
             raise HTTPException(status_code=403, detail="Not enough permissions")
        if current_user.role != UserRole.SITE_MANAGER:
             raise HTTPException(status_code=403, detail="Only managers can assign users")

    target_user = db.query(UserModel).filter(UserModel.id == assignment.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot assign Admin to a complex")

    if complex_obj not in target_user.assigned_complexes:
        target_user.assigned_complexes.append(complex_obj)
        db.commit()
    
    return {"message": "User assigned successfully"}

@router.get("/{complex_id}/users", response_model=List[UserOut])
def read_complex_users(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == complex_id).first()
    if not complex_obj:
        raise HTTPException(status_code=404, detail="Complex not found")

    if current_user.role != UserRole.ADMIN:
        if complex_obj not in current_user.assigned_complexes:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    return db.query(UserModel).join(UserModel.assigned_buildings).filter(
        UserModel.role == UserRole.SITE_RESIDENT,
        BuildingModel.complex_id == complex_id
    ).distinct().all()

@router.put("/{complex_id}", response_model=ResidentialComplexOut)
def update_complex(
    complex_id: int,
    complex_in: ResidentialComplexCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == complex_id).first()
    if not complex_obj:
        raise HTTPException(status_code=404, detail="Complex not found")
    
    # Check if name already exists
    existing = db.query(ResidentialComplexModel).filter(
        ResidentialComplexModel.name == complex_in.name,
        ResidentialComplexModel.id != complex_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Residential complex with this name already exists")

    complex_obj.name = complex_in.name
    complex_obj.address = complex_in.address
    complex_obj.updated_by = current_user.id
    
    db.commit()
    db.refresh(complex_obj)
    return complex_obj

@router.delete("/{complex_id}")
def delete_complex(
    complex_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN]))
):
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == complex_id).first()
    if not complex_obj:
        raise HTTPException(status_code=404, detail="Complex not found")
    
    db.delete(complex_obj)
    db.commit()
    return {"message": "Residential complex deleted successfully"}
