from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.repositories.base_repository import BaseRepository
from app.models.models import PaymentModel, PaymentRecordModel
from app.core.entities import PaymentStatus, PaymentTargetType


class PaymentRepository(BaseRepository[PaymentModel]):
    """Repository for payment data access."""
    
    def __init__(self, db: Session):
        super().__init__(db, PaymentModel)
    
    def get_by_complex(self, complex_id: int, skip: int = 0, limit: int = 50) -> List[PaymentModel]:
        """Get all payments for a complex."""
        return self.db.query(PaymentModel).filter(
            PaymentModel.complex_id == complex_id,
            PaymentModel.is_active == True
        ).offset(skip).limit(limit).all()
    
    def get_by_complex_and_unit(self, complex_id: int, unit_number: str, skip: int = 0, limit: int = 50) -> List[PaymentModel]:
        """Get payments that target a specific unit number."""
        # Get payments for ALL units or payments that specifically include this unit
        return self.db.query(PaymentModel).filter(
            PaymentModel.complex_id == complex_id,
            PaymentModel.is_active == True,
            (
                PaymentModel.target_type == PaymentTargetType.ALL |
                PaymentModel.unit_numbers.contains(unit_number)
            )
        ).offset(skip).limit(limit).all()
    
    def get_by_ids(self, payment_ids: List[int]) -> List[PaymentModel]:
        """Get payments by a list of IDs."""
        if not payment_ids:
            return []
        return self.db.query(PaymentModel).filter(
            PaymentModel.id.in_(payment_ids)
        ).all()


class PaymentRecordRepository(BaseRepository[PaymentRecordModel]):
    """Repository for payment record data access."""
    
    def __init__(self, db: Session):
        super().__init__(db, PaymentRecordModel)
    
    def get_by_payment(self, payment_id: int) -> List[PaymentRecordModel]:
        """Get all records for a payment."""
        return self.db.query(PaymentRecordModel).filter(
            PaymentRecordModel.payment_id == payment_id
        ).all()
    
    def get_by_unit(self, unit_number: str, skip: int = 0, limit: int = 50) -> List[PaymentRecordModel]:
        """Get all payment records for a unit."""
        return self.db.query(PaymentRecordModel).filter(
            PaymentRecordModel.unit_number == unit_number
        ).order_by(PaymentRecordModel.created_date.desc()).offset(skip).limit(limit).all()
    
    def get_by_payment_and_unit(self, payment_id: int, unit_number: str) -> Optional[PaymentRecordModel]:
        """Get a specific payment record for a unit."""
        return self.db.query(PaymentRecordModel).filter(
            PaymentRecordModel.payment_id == payment_id,
            PaymentRecordModel.unit_number == unit_number
        ).first()
    
    def count_by_payment_and_status(self, payment_id: int, status: PaymentStatus) -> int:
        """Count records by payment and status."""
        return self.db.query(PaymentRecordModel).filter(
            PaymentRecordModel.payment_id == payment_id,
            PaymentRecordModel.status == status
        ).count()
    
    def get_by_complex(self, complex_id: int, skip: int = 0, limit: int = 50) -> List[PaymentRecordModel]:
        """Get all payment records for a complex."""
        return self.db.query(PaymentRecordModel).join(
            PaymentModel
        ).filter(
            PaymentModel.complex_id == complex_id
        ).order_by(PaymentRecordModel.created_date.desc()).offset(skip).limit(limit).all()
    
    def create_records_batch(self, records: List[dict]) -> List[PaymentRecordModel]:
        """Create multiple payment records at once."""
        db_records = [PaymentRecordModel(**record) for record in records]
        self.db.add_all(db_records)
        self.db.commit()
        for record in db_records:
            self.db.refresh(record)
        return db_records
    
    def update_record_status(self, record: PaymentRecordModel, status: PaymentStatus, paid_date: Optional[datetime] = None) -> PaymentRecordModel:
        """Update the status of a payment record."""
        record.status = status
        if status == PaymentStatus.PAID and paid_date:
            record.paid_date = paid_date
        self.db.commit()
        self.db.refresh(record)
        return record
    
    def get_record_by_id(self, record_id: int) -> Optional[PaymentRecordModel]:
        """Get a payment record by ID."""
        return self.db.query(PaymentRecordModel).filter(PaymentRecordModel.id == record_id).first()
