from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.repositories import VisitorRepository, UserRepository, ComplexRepository
from app.models.models import VisitorModel, UserModel
from app.core.entities import UserRole, VisitorStatus
from app.api.v1.schemas import VisitorCreate, VisitorUpdate, VisitorCountByBuilding, VisitorCountByUser, VisitorStatusUpdate
from app.core.logging_config import logger


class VisitorService:
    """Service for visitor-related business logic."""

    def __init__(self, db: Session):
        self.db = db
        self.visitor_repo = VisitorRepository(db)
        self.user_repo = UserRepository(db)
        self.complex_repo = ComplexRepository(db)

    def create_visitor(self, visitor_in: VisitorCreate, current_user: UserModel) -> VisitorModel:
        """Register a visitor for the user's complex."""
        # If admin provides a complex_id, use it; otherwise use the user's assigned complex
        if visitor_in.complex_id is not None and current_user.role == UserRole.ADMIN:
            complex_id = visitor_in.complex_id
            # Verify the complex exists
            complex_obj = self.complex_repo.get_by_id(complex_id)
            if not complex_obj:
                raise HTTPException(status_code=404, detail="Complex not found")
            building_id = 0
            logger.info(f"Admin creating visitor for complex {complex_id}")
        else:
            complex_id = self._get_user_complex_id(current_user)
            building_id = self._get_user_building_id(current_user)

        visit_data = {
            "name": visitor_in.name,
            "plate_number": visitor_in.plate_number,
            "visit_date": datetime.utcnow(),
            "complex_id": complex_id,
            "building_id": building_id,
            "user_id": current_user.id,
            "status": VisitorStatus.PENDING,
        }
        visitor = self.visitor_repo.create(visit_data, created_by=current_user.id)
        logger.info(f"Visitor registered: {visitor.name} for complex {complex_id}")
        return visitor

    def update_visitor(self, visitor_id: int, visitor_in: VisitorUpdate, current_user: UserModel) -> VisitorModel:
        """Update a visitor (creator, admin, or manager of same complex)."""
        visitor = self.visitor_repo.get_by_id(visitor_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        
        self._validate_modify_permission(current_user, visitor)
        
        update_data = {}
        if visitor_in.name is not None:
            update_data["name"] = visitor_in.name
        if visitor_in.plate_number is not None:
            update_data["plate_number"] = visitor_in.plate_number
        if visitor_in.visit_date is not None:
            update_data["visit_date"] = visitor_in.visit_date
        
        visitor = self.visitor_repo.update(visitor, update_data, updated_by=current_user.id)
        logger.info(f"Visitor updated: {visitor.name} (ID: {visitor.id})")
        return visitor

    def update_visitor_status(self, visitor_id: int, status_in: VisitorStatusUpdate, current_user: UserModel) -> VisitorModel:
        """Update visitor status (staff only: admin, manager, or attendant)."""
        visitor = self.visitor_repo.get_by_id(visitor_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        
        # Only staff can update status
        if current_user.role not in [UserRole.ADMIN, UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            raise HTTPException(status_code=403, detail="Only staff can update visitor status")
        
        # For non-admin, must be in same complex
        if current_user.role != UserRole.ADMIN:
            user_complex_ids = [c.id for c in current_user.assigned_complexes]
            if visitor.complex_id not in user_complex_ids:
                raise HTTPException(status_code=403, detail="Not enough permissions for this complex")
        
        update_data = {
            "status": status_in.status,
            "status_updated_by": current_user.id,
            "status_updated_date": datetime.utcnow(),
        }
        
        visitor = self.visitor_repo.update(visitor, update_data, updated_by=current_user.id)
        logger.info(f"Visitor status updated: {visitor.name} (ID: {visitor.id}) -> {status_in.status}")
        return visitor

    def delete_visitor(self, visitor_id: int, current_user: UserModel) -> dict:
        """Delete a visitor (creator, admin, or manager of same complex)."""
        visitor = self.visitor_repo.get_by_id(visitor_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        
        self._validate_modify_permission(current_user, visitor)
        
        self.visitor_repo.delete(visitor)
        logger.info(f"Visitor deleted: {visitor.name} (ID: {visitor.id})")
        return {"message": "Visitor deleted successfully"}

    def list_visitors_for_staff(self, current_user: UserModel) -> List[VisitorModel]:
        """List visitors for last 7 days for managers/attendants."""
        complex_id = self._get_staff_complex_id(current_user)
        since = datetime.utcnow() - timedelta(days=7)
        return self.visitor_repo.get_recent_visitors_for_complex(complex_id, since)

    def list_visitors_for_user(self, current_user: UserModel) -> List[VisitorModel]:
        """List visitors registered by the user in the last 7 days."""
        since = datetime.utcnow() - timedelta(days=7)
        return self.visitor_repo.get_recent_visitors_for_user(current_user.id, since)

    def list_visitors_for_manager(self, current_user: UserModel, visit_date: date) -> List[VisitorModel]:
        """List visitors for a specific date (manager-only)."""
        complex_id = self._get_manager_complex_id(current_user)
        return self.visitor_repo.get_visitors_by_date(complex_id, visit_date)

    # Admin methods
    def admin_list_visitors(self, complex_id: int, visit_date: Optional[date] = None) -> List[VisitorModel]:
        """List visitors for any complex (admin only)."""
        if visit_date:
            return self.visitor_repo.get_visitors_by_date(complex_id, visit_date)
        return self.visitor_repo.get_visitors_for_complex(complex_id)

    def admin_update_visitor(self, visitor_id: int, visitor_in: VisitorUpdate, current_user: UserModel) -> VisitorModel:
        """Update any visitor (admin only)."""
        visitor = self.visitor_repo.get_by_id(visitor_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        
        update_data = {}
        if visitor_in.name is not None:
            update_data["name"] = visitor_in.name
        if visitor_in.plate_number is not None:
            update_data["plate_number"] = visitor_in.plate_number
        if visitor_in.visit_date is not None:
            update_data["visit_date"] = visitor_in.visit_date
        
        visitor = self.visitor_repo.update(visitor, update_data, updated_by=current_user.id)
        logger.info(f"Admin updated visitor: {visitor.name} (ID: {visitor.id})")
        return visitor

    def admin_delete_visitor(self, visitor_id: int) -> dict:
        """Delete any visitor (admin only)."""
        visitor = self.visitor_repo.get_by_id(visitor_id)
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        
        self.visitor_repo.delete(visitor)
        logger.info(f"Admin deleted visitor: {visitor.name} (ID: {visitor.id})")
        return {"message": "Visitor deleted successfully"}

    # Stats methods
    def get_visitor_counts_by_building_for_manager(self, current_user: UserModel) -> List[VisitorCountByBuilding]:
        """Get visitor counts grouped by building for manager's complex."""
        complex_id = self._get_manager_complex_id(current_user)
        return self._build_visitor_counts_by_building([complex_id])

    def get_visitor_counts_by_building_for_admin(self, complex_id: int) -> List[VisitorCountByBuilding]:
        """Get visitor counts grouped by building for a specific complex (admin)."""
        self._ensure_complex_exists(complex_id)
        return self._build_visitor_counts_by_building([complex_id])

    def _build_visitor_counts_by_building(self, complex_ids: List[int]) -> List[VisitorCountByBuilding]:
        """Build visitor counts grouped by building."""
        from app.models.models import BuildingModel
        from sqlalchemy import func
        
        query = (
            self.db.query(BuildingModel.id, BuildingModel.name, func.count(VisitorModel.id))
            .outerjoin(VisitorModel, VisitorModel.building_id == BuildingModel.id)
            .filter(BuildingModel.complex_id.in_(complex_ids))
            .group_by(BuildingModel.id, BuildingModel.name)
        )
        return [
            VisitorCountByBuilding(
                building_id=building_id,
                building_name=name,
                visitor_count=count,
            )
            for building_id, name, count in query.all()
        ]

    def get_visitor_counts_by_user_for_manager(self, current_user: UserModel) -> List[VisitorCountByUser]:
        """Get visitor counts grouped by username for manager's complex."""
        complex_id = self._get_manager_complex_id(current_user)
        return self._build_visitor_counts_by_user([complex_id])

    def get_visitor_counts_by_user_for_admin(self, complex_id: int) -> List[VisitorCountByUser]:
        """Get visitor counts grouped by username for a specific complex (admin)."""
        self._ensure_complex_exists(complex_id)
        return self._build_visitor_counts_by_user([complex_id])

    def _build_visitor_counts_by_user(self, complex_ids: List[int]) -> List[VisitorCountByUser]:
        """Build visitor counts grouped by username."""
        from sqlalchemy import func
        
        query = (
            self.db.query(VisitorModel.user_id, func.count(VisitorModel.id))
            .filter(VisitorModel.complex_id.in_(complex_ids))
            .group_by(VisitorModel.user_id)
        )
        result = []
        for user_id, count in query.all():
            user = self.user_repo.get_by_id(user_id)
            if user:
                result.append(VisitorCountByUser(
                    user_id=user.id,
                    username=user.username,
                    visitor_count=count,
                ))
        return result

    def _get_user_complex_id(self, current_user: UserModel) -> int:
        """Resolve complex ID from user assignments."""
        if current_user.assigned_complexes:
            return current_user.assigned_complexes[0].id
        if current_user.assigned_buildings:
            return current_user.assigned_buildings[0].complex_id
        raise HTTPException(status_code=400, detail="User is not assigned to a complex")

    def _get_user_building_id(self, current_user: UserModel) -> int:
        """Resolve building ID from user assignments."""
        if current_user.assigned_buildings:
            return current_user.assigned_buildings[0].id
        return 0

    def _get_staff_complex_id(self, current_user: UserModel) -> int:
        """Resolve complex ID for managers/attendants."""
        if current_user.role not in [UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT]:
            raise HTTPException(status_code=403, detail="Only managers or attendants can access this endpoint")
        if not current_user.assigned_complexes:
            raise HTTPException(status_code=400, detail="Staff user is not assigned to a complex")
        return current_user.assigned_complexes[0].id

    def _get_manager_complex_id(self, current_user: UserModel) -> int:
        """Resolve complex ID for managers."""
        if current_user.role != UserRole.SITE_MANAGER:
            raise HTTPException(status_code=403, detail="Only site managers can access this endpoint")
        if not current_user.assigned_complexes:
            raise HTTPException(status_code=400, detail="Manager is not assigned to any complex")
        return current_user.assigned_complexes[0].id

    def _validate_modify_permission(self, current_user: UserModel, visitor: VisitorModel):
        """Validate if current user can modify/delete the visitor."""
        if current_user.role == UserRole.ADMIN:
            return
        if visitor.user_id == current_user.id:
            return
        if current_user.role == UserRole.SITE_MANAGER:
            complex_ids = [c.id for c in current_user.assigned_complexes]
            if visitor.complex_id in complex_ids:
                return
        raise HTTPException(status_code=403, detail="Not enough permissions")

    def _ensure_complex_exists(self, complex_id: int) -> None:
        """Ensure the complex exists."""
        if not self.complex_repo.get_by_id(complex_id):
            raise HTTPException(status_code=404, detail="Complex not found")
