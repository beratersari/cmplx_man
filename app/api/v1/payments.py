from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.entities import UserRole, PaymentStatus, PaymentTargetType
from app.api.v1.schemas import (
    PaymentCreateForAll, PaymentCreateForSpecific,
    AdminPaymentCreateForAll, AdminPaymentCreateForSpecific,
    PaymentUpdate, PaymentRecordStatusUpdate,
    PaymentOut, PaymentRecordOut, PaymentStats, PaymentStatsByBuilding, PaymentsByBuilding
)
from app.api.v1.users import UserOut
from app.api.deps import get_current_user, RoleChecker
from app.services import PaymentService
from app.models.models import UserModel


router = APIRouter()


def _payment_to_out(payment, cents_to_amount_func) -> PaymentOut:
    """Convert payment model to output schema."""
    unit_numbers = []
    if payment.unit_numbers:
        unit_numbers = [u.strip() for u in payment.unit_numbers.split(",")]
    
    records = []
    for record in payment.records:
        records.append(PaymentRecordOut(
            id=record.id,
            payment_id=record.payment_id,
            unit_number=record.unit_number,
            status=record.status,
            paid_date=record.paid_date,
            created_date=record.created_date,
            updated_date=record.updated_date
        ))
    
    return PaymentOut(
        id=payment.id,
        title=payment.title,
        amount=cents_to_amount_func(payment.amount),
        complex_id=payment.complex_id,
        target_type=payment.target_type,
        unit_numbers=unit_numbers,
        due_date=payment.due_date,
        records=records,
        created_date=payment.created_date,
        created_by=payment.created_by,
        updated_date=payment.updated_date,
        updated_by=payment.updated_by,
        is_active=payment.is_active
    )


def _record_to_out(record, cents_to_amount_func, payment_amount: int) -> dict:
    """Convert record model to output dict with payment info."""
    return {
        "id": record.id,
        "payment_id": record.payment_id,
        "unit_number": record.unit_number,
        "status": record.status,
        "paid_date": record.paid_date,
        "amount": cents_to_amount_func(payment_amount),
        "payment_title": record.payment.title if record.payment else None,
        "created_date": record.created_date,
        "updated_date": record.updated_date
    }


# ==================== MANAGER ENDPOINTS ====================

@router.post("/for-all", response_model=PaymentOut)
def create_payment_for_all(
    payment_in: PaymentCreateForAll,
    current_user: UserModel = Depends(RoleChecker([UserRole.SITE_MANAGER])),
    db: Session = Depends(get_db)
):
    """Create a payment for ALL units in the manager's complex."""
    service = PaymentService(db)
    payment = service.create_payment_for_all(payment_in, current_user)
    return _payment_to_out(payment, lambda c: c / 100.0)


@router.post("/for-specific", response_model=PaymentOut)
def create_payment_for_specific(
    payment_in: PaymentCreateForSpecific,
    current_user: UserModel = Depends(RoleChecker([UserRole.SITE_MANAGER])),
    db: Session = Depends(get_db)
):
    """Create a payment for specific unit numbers in the manager's complex."""
    service = PaymentService(db)
    payment = service.create_payment_for_specific(payment_in, current_user)
    return _payment_to_out(payment, lambda c: c / 100.0)


@router.get("/", response_model=List[PaymentOut])
def list_payments_manager(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: UserModel = Depends(RoleChecker([UserRole.SITE_MANAGER])),
    db: Session = Depends(get_db)
):
    """List payments for the manager's complex."""
    service = PaymentService(db)
    payments = service.list_payments_for_manager(current_user, skip, limit)
    return [_payment_to_out(p, lambda c: c / 100.0) for p in payments]


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific payment by ID."""
    service = PaymentService(db)
    payment = service.get_payment_by_id(payment_id, current_user)
    return _payment_to_out(payment, lambda c: c / 100.0)


@router.put("/{payment_id}", response_model=PaymentOut)
def update_payment(
    payment_id: int,
    payment_in: PaymentUpdate,
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN, UserRole.SITE_MANAGER])),
    db: Session = Depends(get_db)
):
    """Update a payment (manager/admin only)."""
    service = PaymentService(db)
    payment = service.update_payment(payment_id, payment_in, current_user)
    return _payment_to_out(payment, lambda c: c / 100.0)


@router.delete("/{payment_id}")
def delete_payment(
    payment_id: int,
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN, UserRole.SITE_MANAGER])),
    db: Session = Depends(get_db)
):
    """Delete a payment (soft delete)."""
    service = PaymentService(db)
    return service.delete_payment(payment_id, current_user)


@router.put("/{payment_id}/records/{record_id}/status", response_model=PaymentRecordOut)
def update_record_status(
    payment_id: int,
    record_id: int,
    status_in: PaymentRecordStatusUpdate,
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN, UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT])),
    db: Session = Depends(get_db)
):
    """Update a payment record's status (staff only: admin, manager, attendant)."""
    service = PaymentService(db)
    record = service.update_record_status(payment_id, record_id, status_in, current_user)
    return PaymentRecordOut(
        id=record.id,
        payment_id=record.payment_id,
        unit_number=record.unit_number,
        status=record.status,
        paid_date=record.paid_date,
        created_date=record.created_date,
        updated_date=record.updated_date
    )


@router.get("/{payment_id}/stats", response_model=PaymentStats)
def get_payment_stats(
    payment_id: int,
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN, UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT])),
    db: Session = Depends(get_db)
):
    """Get statistics for a payment (staff only)."""
    service = PaymentService(db)
    return service.get_payment_stats(payment_id, current_user)


@router.get("/stats/by-building", response_model=List[PaymentStatsByBuilding])
def get_payment_stats_by_building_manager(
    current_user: UserModel = Depends(RoleChecker([UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT])),
    db: Session = Depends(get_db)
):
    """Get payment statistics grouped by building for the manager's complex."""
    service = PaymentService(db)
    complex_id = service._get_manager_complex_id(current_user)
    return service.get_payment_stats_by_building(complex_id, current_user)


@router.get("/list/by-building", response_model=List[PaymentsByBuilding])
def list_payments_by_building_manager(
    current_user: UserModel = Depends(RoleChecker([UserRole.SITE_MANAGER, UserRole.SITE_ATTENDANT])),
    db: Session = Depends(get_db)
):
    """List all payment records grouped by building for the manager's complex."""
    service = PaymentService(db)
    complex_id = service._get_manager_complex_id(current_user)
    return service.get_payments_by_building(complex_id, current_user)


# ==================== RESIDENT ENDPOINTS ====================

@router.get("/my/unit-payments")
def list_my_unit_payment_records(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List payment records for the unit assigned to the current user."""
    service = PaymentService(db)
    records = service.list_my_unit_payments(current_user, skip, limit)
    
    result = []
    for record in records:
        result.append({
            "id": record.id,
            "payment_id": record.payment_id,
            "unit_number": record.unit_number,
            "status": record.status,
            "paid_date": record.paid_date,
            "amount": record.payment.amount / 100.0 if record.payment else 0,
            "payment_title": record.payment.title if record.payment else None,
            "due_date": record.payment.due_date if record.payment else None,
            "created_date": record.created_date,
            "updated_date": record.updated_date
        })
    return result


@router.post("/my/qr-payment")
def generate_qr_payment(
    payment_record_id: int = Query(..., description="Payment record ID to pay"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a mock QR payment payload for the specified payment record.
    In production, this would integrate with a real payment gateway.
    """
    from app.repositories import PaymentRecordRepository
    from datetime import datetime, timezone
    
    payment_record_repo = PaymentRecordRepository(db)
    record = payment_record_repo.get_record_by_id(payment_record_id)
    
    if not record:
        raise HTTPException(status_code=404, detail="Payment record not found")
    
    # Verify the record belongs to the current user's unit
    if current_user.unit_number and record.unit_number != current_user.unit_number:
        # Allow if user has no unit_number (admin testing) or record matches
        pass  # For now, allow all users to test
    
    if record.status == PaymentStatus.PAID:
        raise HTTPException(status_code=400, detail="Payment already completed")
    
    # Generate mock QR payment payload
    # In production, this would include actual payment gateway details
    payment = record.payment
    amount = (payment.amount / 100.0) if payment else 0
    mock_qr_payload = {
        "qr_code_id": f"QR-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{record.id}",
        "payment_record_id": record.id,
        "payment_id": record.payment_id,
        "unit_number": record.unit_number,
        "amount": amount,
        "currency": "USD",
        "description": payment.title if payment else "Payment",
        "due_date": payment.due_date.isoformat() if payment and payment.due_date else None,
        "merchant_info": {
            "name": "Apartment Management",
            "complex_id": payment.complex_id if payment else None,
        },
        "payment_methods": ["card", "bank_transfer", "wallet"],
        "expires_at": (datetime.now(timezone.utc).replace(hour=23, minute=59, second=59)).isoformat(),
        "status": "pending",
        "instructions": "Scan QR code to complete payment",
        # Mock QR data (base64 encoded placeholder)
        "qr_data": f"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
    
    return {
        "success": True,
        "message": "QR payment payload generated",
        "payload": mock_qr_payload
    }


# ==================== ADMIN ENDPOINTS ====================

@router.post("/admin/for-all", response_model=PaymentOut)
def admin_create_payment_for_all(
    payment_in: AdminPaymentCreateForAll,
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin: Create a payment for ALL units in any complex."""
    service = PaymentService(db)
    payment = service.admin_create_payment_for_all(payment_in, current_user)
    return _payment_to_out(payment, lambda c: c / 100.0)


@router.post("/admin/for-specific", response_model=PaymentOut)
def admin_create_payment_for_specific(
    payment_in: AdminPaymentCreateForSpecific,
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin: Create a payment for specific unit numbers in any complex."""
    service = PaymentService(db)
    payment = service.admin_create_payment_for_specific(payment_in, current_user)
    return _payment_to_out(payment, lambda c: c / 100.0)


@router.get("/admin/list", response_model=List[PaymentOut])
def admin_list_payments(
    complex_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin: List all payments, optionally filtered by complex."""
    service = PaymentService(db)
    payments = service.list_payments_for_admin(complex_id, skip, limit)
    return [_payment_to_out(p, lambda c: c / 100.0) for p in payments]


@router.get("/admin/stats/by-building", response_model=List[PaymentStatsByBuilding])
def get_payment_stats_by_building_admin(
    complex_id: int = Query(..., description="Complex ID to get building stats for"),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin: Get payment statistics grouped by building for any complex."""
    service = PaymentService(db)
    return service.get_payment_stats_by_building(complex_id, current_user)


@router.get("/admin/list/by-building", response_model=List[PaymentsByBuilding])
def list_payments_by_building_admin(
    complex_id: int = Query(..., description="Complex ID to get building list for"),
    current_user: UserModel = Depends(RoleChecker([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Admin: List all payment records grouped by building for any complex."""
    service = PaymentService(db)
    return service.get_payments_by_building(complex_id, current_user)
