from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime

from app.repositories import PaymentRepository, PaymentRecordRepository, UserRepository, ComplexRepository, BuildingRepository
from app.models.models import UserModel, PaymentModel, PaymentRecordModel, BuildingModel
from app.core.entities import UserRole, PaymentStatus, PaymentTargetType
from app.api.v1.schemas import (
    PaymentCreateForAll, PaymentCreateForSpecific,
    AdminPaymentCreateForAll, AdminPaymentCreateForSpecific,
    PaymentUpdate, PaymentRecordStatusUpdate, PaymentStats, PaymentStatsByBuilding,
    PaymentsByBuilding, PaymentRecordInBuilding
)
from app.core.logging_config import logger


class PaymentService:
    """Service for payment-related business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.payment_repo = PaymentRepository(db)
        self.record_repo = PaymentRecordRepository(db)
        self.user_repo = UserRepository(db)
        self.complex_repo = ComplexRepository(db)
        self.building_repo = BuildingRepository(db)
    
    def _get_manager_complex_id(self, user: UserModel) -> int:
        """Get the complex ID for a manager (must have exactly one complex)."""
        if not user.assigned_complexes:
            raise HTTPException(status_code=400, detail="User is not assigned to any complex")
        return user.assigned_complexes[0].id
    
    def _validate_payment_access(self, payment: PaymentModel, user: UserModel) -> None:
        """Validate that user has access to this payment."""
        if user.role == UserRole.ADMIN:
            return
        
        user_complex_ids = {c.id for c in user.assigned_complexes}
        if payment.complex_id not in user_complex_ids:
            raise HTTPException(status_code=403, detail="Not authorized to access this payment")
    
    def _amount_to_cents(self, amount: float) -> int:
        """Convert dollar amount to cents."""
        return int(amount * 100)
    
    def _cents_to_amount(self, cents: int) -> float:
        """Convert cents to dollar amount."""
        return cents / 100.0
    
    def _get_unique_unit_numbers_in_complex(self, complex_id: int) -> List[str]:
        """Get all unique unit numbers in a complex."""
        users = self.db.query(UserModel).filter(
            UserModel.unit_number.isnot(None),
            UserModel.is_active == True
        ).all()
        # Filter by complex membership and get unique units
        units = set()
        for user in users:
            user_complex_ids = {c.id for c in user.assigned_complexes}
            if complex_id in user_complex_ids:
                units.add(user.unit_number)
        return list(units)
    
    def create_payment_for_all(
        self, 
        payment_in: PaymentCreateForAll, 
        current_user: UserModel
    ) -> PaymentModel:
        """Create a payment for ALL units in the manager's complex."""
        logger.info(f"Manager {current_user.username} creating payment for all units")
        
        complex_id = self._get_manager_complex_id(current_user)
        return self._create_payment_internal(
            title=payment_in.title,
            amount=payment_in.amount,
            complex_id=complex_id,
            target_type=PaymentTargetType.ALL,
            unit_numbers=[],
            due_date=payment_in.due_date,
            created_by=current_user.id
        )
    
    def create_payment_for_specific(
        self, 
        payment_in: PaymentCreateForSpecific, 
        current_user: UserModel
    ) -> PaymentModel:
        """Create a payment for specific unit numbers in the manager's complex."""
        logger.info(f"Manager {current_user.username} creating payment for specific units: {payment_in.unit_numbers}")
        
        complex_id = self._get_manager_complex_id(current_user)
        return self._create_payment_internal(
            title=payment_in.title,
            amount=payment_in.amount,
            complex_id=complex_id,
            target_type=PaymentTargetType.SPECIFIC,
            unit_numbers=payment_in.unit_numbers,
            due_date=payment_in.due_date,
            created_by=current_user.id
        )
    
    def admin_create_payment_for_all(
        self, 
        payment_in: AdminPaymentCreateForAll, 
        current_user: UserModel
    ) -> PaymentModel:
        """Admin: Create a payment for ALL units in any complex."""
        logger.info(f"Admin {current_user.username} creating payment for all units in complex {payment_in.complex_id}")
        
        if not self.complex_repo.exists(payment_in.complex_id):
            raise HTTPException(status_code=404, detail="Complex not found")
        
        return self._create_payment_internal(
            title=payment_in.title,
            amount=payment_in.amount,
            complex_id=payment_in.complex_id,
            target_type=PaymentTargetType.ALL,
            unit_numbers=[],
            due_date=payment_in.due_date,
            created_by=current_user.id
        )
    
    def admin_create_payment_for_specific(
        self, 
        payment_in: AdminPaymentCreateForSpecific, 
        current_user: UserModel
    ) -> PaymentModel:
        """Admin: Create a payment for specific unit numbers in any complex."""
        logger.info(f"Admin {current_user.username} creating payment for specific units in complex {payment_in.complex_id}")
        
        if not self.complex_repo.exists(payment_in.complex_id):
            raise HTTPException(status_code=404, detail="Complex not found")
        
        return self._create_payment_internal(
            title=payment_in.title,
            amount=payment_in.amount,
            complex_id=payment_in.complex_id,
            target_type=PaymentTargetType.SPECIFIC,
            unit_numbers=payment_in.unit_numbers,
            due_date=payment_in.due_date,
            created_by=current_user.id
        )
    
    def _create_payment_internal(
        self,
        title: str,
        amount: float,
        complex_id: int,
        target_type: PaymentTargetType,
        unit_numbers: List[str],
        due_date: Optional[datetime],
        created_by: int
    ) -> PaymentModel:
        """Internal method to create a payment and its records."""
        # Create the payment
        payment_data = {
            "title": title,
            "amount": self._amount_to_cents(amount),
            "complex_id": complex_id,
            "target_type": target_type,
            "unit_numbers": ",".join(unit_numbers) if unit_numbers else None,
            "due_date": due_date
        }
        
        payment = self.payment_repo.create(payment_data, created_by=created_by)
        
        # Determine target units
        if target_type == PaymentTargetType.ALL:
            target_units = self._get_unique_unit_numbers_in_complex(complex_id)
        else:
            target_units = unit_numbers
        
        if not target_units:
            logger.warning(f"No unit numbers found for payment {payment.id}")
            return payment
        
        # Create records
        records_data = []
        for unit in target_units:
            records_data.append({
                "payment_id": payment.id,
                "unit_number": unit,
                "status": PaymentStatus.PENDING
            })
        
        if records_data:
            self.record_repo.create_records_batch(records_data)
        
        logger.info(f"Created payment {payment.id} with {len(records_data)} records")
        return payment
    
    def get_payment_by_id(self, payment_id: int, current_user: UserModel) -> PaymentModel:
        """Get a payment by ID."""
        payment = self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        self._validate_payment_access(payment, current_user)
        return payment
    
    def list_payments_for_manager(
        self, 
        current_user: UserModel, 
        skip: int = 0, 
        limit: int = 50
    ) -> List[PaymentModel]:
        """List payments for a manager's complex."""
        complex_id = self._get_manager_complex_id(current_user)
        return self.payment_repo.get_by_complex(complex_id, skip, limit)
    
    def list_payments_for_admin(
        self, 
        complex_id: Optional[int],
        skip: int = 0, 
        limit: int = 50
    ) -> List[PaymentModel]:
        """Admin: List payments, optionally filtered by complex."""
        if complex_id:
            return self.payment_repo.get_by_complex(complex_id, skip, limit)
        return self.payment_repo.get_all(skip, limit)
    
    def list_my_unit_payments(
        self, 
        current_user: UserModel,
        skip: int = 0, 
        limit: int = 50
    ) -> List[PaymentRecordModel]:
        """List payment records for the current user's unit."""
        if not current_user.unit_number:
            return []
        return self.record_repo.get_by_unit(current_user.unit_number, skip, limit)
    
    def update_payment(
        self, 
        payment_id: int, 
        payment_in: PaymentUpdate, 
        current_user: UserModel
    ) -> PaymentModel:
        """Update a payment (manager/admin only)."""
        payment = self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        self._validate_payment_access(payment, current_user)
        
        update_data = {}
        if payment_in.title:
            update_data["title"] = payment_in.title
        if payment_in.amount:
            update_data["amount"] = self._amount_to_cents(payment_in.amount)
        if payment_in.due_date is not None:
            update_data["due_date"] = payment_in.due_date
        
        return self.payment_repo.update(payment, update_data, updated_by=current_user.id)
    
    def delete_payment(self, payment_id: int, current_user: UserModel) -> dict:
        """Delete a payment (manager/admin only)."""
        payment = self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        self._validate_payment_access(payment, current_user)
        
        # Soft delete
        self.payment_repo.update(payment, {"is_active": False}, updated_by=current_user.id)
        
        logger.info(f"Payment {payment_id} deleted by {current_user.username}")
        return {"message": "Payment deleted successfully"}
    
    def update_record_status(
        self,
        payment_id: int,
        record_id: int,
        status_in: PaymentRecordStatusUpdate,
        current_user: UserModel
    ) -> PaymentRecordModel:
        """Update a payment record's status (manager/admin/attendant only)."""
        payment = self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        self._validate_payment_access(payment, current_user)
        
        record = self.record_repo.get_by_id(record_id)
        if not record or record.payment_id != payment_id:
            raise HTTPException(status_code=404, detail="Payment record not found")
        
        update_data = {"status": status_in.status}
        
        if status_in.status == PaymentStatus.PAID:
            update_data["paid_date"] = datetime.utcnow()
        else:
            update_data["paid_date"] = None
        
        return self.record_repo.update(record, update_data, updated_by=current_user.id)
    
    def get_payment_stats(self, payment_id: int, current_user: UserModel) -> PaymentStats:
        """Get statistics for a payment."""
        payment = self.payment_repo.get_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        self._validate_payment_access(payment, current_user)
        
        records = self.record_repo.get_by_payment(payment_id)
        
        pending_count = 0
        paid_count = 0
        overdue_count = 0
        cancelled_count = 0
        
        for record in records:
            if record.status == PaymentStatus.PENDING:
                pending_count += 1
            elif record.status == PaymentStatus.PAID:
                paid_count += 1
            elif record.status == PaymentStatus.OVERDUE:
                overdue_count += 1
            elif record.status == PaymentStatus.CANCELLED:
                cancelled_count += 1
        
        total_records = len(records)
        amount = self._cents_to_amount(payment.amount)
        total_amount = amount * total_records
        collected_amount = amount * paid_count
        pending_amount = amount * (pending_count + overdue_count)
        
        return PaymentStats(
            total_records=total_records,
            pending_count=pending_count,
            paid_count=paid_count,
            overdue_count=overdue_count,
            cancelled_count=cancelled_count,
            total_amount=total_amount,
            collected_amount=collected_amount,
            pending_amount=pending_amount
        )
    
    def get_payment_stats_by_building(
        self, 
        complex_id: int, 
        current_user: UserModel
    ) -> List[PaymentStatsByBuilding]:
        """Get payment statistics grouped by building for a complex."""
        # Validate access
        if current_user.role == UserRole.ADMIN:
            if not self.complex_repo.exists(complex_id):
                raise HTTPException(status_code=404, detail="Complex not found")
        else:
            user_complex_ids = {c.id for c in current_user.assigned_complexes}
            if complex_id not in user_complex_ids:
                raise HTTPException(status_code=403, detail="Not authorized to access this complex")
        
        # Get all buildings in the complex
        buildings = self.building_repo.get_by_complex(complex_id)
        
        # Get all users with their unit numbers grouped by building
        result = []
        for building in buildings:
            # Get unique unit numbers for this building
            unit_numbers = self._get_unit_numbers_in_building(building.id)
            
            # Get payment records for these units
            building_stats = self._calculate_building_stats(building.id, building.name, unit_numbers)
            result.append(building_stats)
        
        return result
    
    def get_payments_by_building(
        self,
        complex_id: int,
        current_user: UserModel
    ) -> List[PaymentsByBuilding]:
        """Get all payment records grouped by building for a complex."""
        # Validate access
        if current_user.role == UserRole.ADMIN:
            if not self.complex_repo.exists(complex_id):
                raise HTTPException(status_code=404, detail="Complex not found")
        else:
            user_complex_ids = {c.id for c in current_user.assigned_complexes}
            if complex_id not in user_complex_ids:
                raise HTTPException(status_code=403, detail="Not authorized to access this complex")
        
        # Get all buildings in the complex
        buildings = self.building_repo.get_by_complex(complex_id)
        
        result = []
        for building in buildings:
            # Get unique unit numbers for this building
            unit_numbers = self._get_unit_numbers_in_building(building.id)
            
            if not unit_numbers:
                result.append(PaymentsByBuilding(
                    building_id=building.id,
                    building_name=building.name,
                    records=[]
                ))
                continue
            
            # Get all payment records for these units
            records = self.db.query(PaymentRecordModel).filter(
                PaymentRecordModel.unit_number.in_(unit_numbers)
            ).all()
            
            records_out = []
            for r in records:
                records_out.append(PaymentRecordInBuilding(
                    id=r.id,
                    payment_id=r.payment_id,
                    payment_title=r.payment.title if r.payment else "Unknown",
                    unit_number=r.unit_number,
                    amount=self._cents_to_amount(r.payment.amount) if r.payment else 0.0,
                    status=r.status,
                    due_date=r.payment.due_date if r.payment else None,
                    paid_date=r.paid_date
                ))
            
            result.append(PaymentsByBuilding(
                building_id=building.id,
                building_name=building.name,
                records=records_out
            ))
            
        return result

    def _get_unit_numbers_in_building(self, building_id: int) -> List[str]:
        """Helper to get all unit numbers in a building."""
        # Get building to access residents
        building = self.building_repo.get_by_id(building_id)
        if not building:
            return []
            
        unit_numbers = set()
        for resident in building.residents:
            if resident.unit_number:
                unit_numbers.add(resident.unit_number)
        return list(unit_numbers)
    
    def _calculate_building_stats(
        self, 
        building_id: int, 
        building_name: str, 
        unit_numbers: List[str]
    ) -> PaymentStatsByBuilding:
        """Calculate payment statistics for a building based on unit numbers."""
        if not unit_numbers:
            return PaymentStatsByBuilding(
                building_id=building_id,
                building_name=building_name,
                total_records=0,
                pending_count=0,
                paid_count=0,
                overdue_count=0,
                cancelled_count=0,
                total_amount=0.0,
                collected_amount=0.0,
                pending_amount=0.0
            )
        
        # Get all payment records for these units
        records = self.db.query(PaymentRecordModel).filter(
            PaymentRecordModel.unit_number.in_(unit_numbers)
        ).all()
        
        pending_count = 0
        paid_count = 0
        overdue_count = 0
        cancelled_count = 0
        
        # Group by payment to get amounts
        payment_ids = set(r.payment_id for r in records)
        payments = self.payment_repo.get_by_ids(list(payment_ids)) if payment_ids else []
        payment_amounts = {p.id: p.amount for p in payments}
        
        for record in records:
            if record.status == PaymentStatus.PENDING:
                pending_count += 1
            elif record.status == PaymentStatus.PAID:
                paid_count += 1
            elif record.status == PaymentStatus.OVERDUE:
                overdue_count += 1
            elif record.status == PaymentStatus.CANCELLED:
                cancelled_count += 1
        
        # Calculate amounts (average payment amount per unit)
        total_records = len(records)
        if total_records > 0:
            avg_amount = sum(payment_amounts.values()) / len(payment_amounts) if payment_amounts else 0
            avg_amount = avg_amount / 100.0  # Convert cents to dollars
        else:
            avg_amount = 0
        
        total_amount = avg_amount * total_records
        collected_amount = avg_amount * paid_count
        pending_amount = avg_amount * (pending_count + overdue_count)
        
        return PaymentStatsByBuilding(
            building_id=building_id,
            building_name=building_name,
            total_records=total_records,
            pending_count=pending_count,
            paid_count=paid_count,
            overdue_count=overdue_count,
            cancelled_count=cancelled_count,
            total_amount=total_amount,
            collected_amount=collected_amount,
            pending_amount=pending_amount
        )
