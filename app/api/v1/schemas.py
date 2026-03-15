from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.core.entities import UserRole, IssueStatus, MarketplaceItemStatus, VisitorStatus, PaymentStatus, PaymentTargetType

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    email: EmailStr
    role: UserRole
    is_active: bool = True
    contact: Optional[str] = None
    description: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    contact: Optional[str] = None
    description: Optional[str] = None
    unit_number: Optional[str] = None
    complex_ids: Optional[List[int]] = None
    building_ids: Optional[List[int]] = None

class ComplexSummary(BaseModel):
    """Minimal complex info for user profile."""
    id: int
    name: str

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: UserRole
    is_active: bool
    contact: Optional[str] = None
    description: Optional[str] = None
    unit_number: Optional[str] = None
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]
    # Complex assignment info
    assigned_complexes: List[ComplexSummary] = []
    # Notification preferences
    push_notifications_enabled: bool = True
    email_notifications_enabled: bool = True
    payment_reminder_days: int = 3

    class Config:
        from_attributes = True

class ComplexAssignment(BaseModel):
    """Schema for managers to assign users to their complex."""
    user_id: int = Field(..., gt=0)


class AdminComplexAssignment(BaseModel):
    """Schema for admins to assign users to any complex."""
    user_id: int = Field(..., gt=0)
    complex_id: int = Field(..., gt=0)

class ResidentialComplexBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    address: str = Field(..., min_length=5, max_length=200)

class ResidentialComplexCreate(ResidentialComplexBase):
    pass

class ResidentialComplexOut(ResidentialComplexBase):
    id: int
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]

    class Config:
        from_attributes = True

class BuildingBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)


class BuildingCreate(BuildingBase):
    """Schema for managers to create a building in their complex."""
    pass


class AdminBuildingCreate(BuildingBase):
    """Schema for admins to create a building in any complex."""
    complex_id: int = Field(..., gt=0)

class BuildingOut(BaseModel):
    id: int
    name: str
    complex_id: int
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]

    class Config:
        from_attributes = True

class VehicleBase(BaseModel):
    user_id: int = Field(..., gt=0)
    plate_number: str = Field(..., min_length=3, max_length=20)

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    plate_number: Optional[str] = Field(None, min_length=3, max_length=20)

class VehicleOut(VehicleBase):
    id: int
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class BuildingAssignment(BaseModel):
    user_id: int = Field(..., gt=0)
    building_id: int = Field(..., gt=0)

class AnnouncementBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=5)
    img_path: Optional[str] = None
    complex_id: int = Field(..., gt=0)
    comments_enabled: bool = True

class AnnouncementCreate(AnnouncementBase):
    pass

class EmotionCount(BaseModel):
    emoji: str
    count: int

class UserReaction(BaseModel):
    user_id: int
    username: str
    emoji: str

class CommentBase(BaseModel):
    content: str = Field(..., min_length=1)

class CommentCreate(CommentBase):
    """Schema for creating a top-level comment on an announcement."""
    pass

class ReplyCreate(CommentBase):
    """Schema for creating a reply to a comment."""
    parent_id: int = Field(..., gt=0, description="ID of the comment being replied to")

class CommentOut(BaseModel):
    id: int
    content: str
    announcement_id: int
    parent_id: Optional[int]
    created_date: datetime
    created_by: Optional[int]
    username: Optional[str] = None
    emotion_counts: List[EmotionCount] = []
    replies: List['CommentOut'] = []

    class Config:
        from_attributes = True

class AnnouncementOut(AnnouncementBase):
    id: int
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]
    emotion_counts: List[EmotionCount] = []
    user_reactions: List[UserReaction] = []
    comments: List[CommentOut] = []
    is_read: bool = False
    read_count: Optional[int] = None
    unread_count: Optional[int] = None

    class Config:
        from_attributes = True

class AnnouncementReadOut(BaseModel):
    user_id: int
    username: str
    read_date: datetime

    class Config:
        from_attributes = True

class AnnouncementReadStats(BaseModel):
    announcement_id: int
    read_count: int
    unread_count: int
    read_by: List[AnnouncementReadOut] = []
    unread_by: List[UserOut] = []

    class Config:
        from_attributes = True

class EmotionCreate(BaseModel):
    emoji: str = Field(..., pattern="^:(happy|sad|surprised|angry|heart):$")

class IssueImageOut(BaseModel):
    id: int
    img_path: str

    class Config:
        from_attributes = True

class IssueBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=5)

class IssueCreate(IssueBase):
    category_id: int = Field(..., gt=0, description="ID of the category for this issue")
    img_paths: List[str] = []

class AdminIssueCreate(IssueCreate):
    complex_id: int = Field(..., gt=0)

class IssueOut(IssueBase):
    id: int
    user_id: int
    complex_id: int
    building_id: int
    category_id: int
    status: IssueStatus
    created_date: datetime
    updated_date: Optional[datetime] = None
    updated_by: Optional[int] = None
    images: List[IssueImageOut] = []

    class Config:
        from_attributes = True

class IssueUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=5)
    status: Optional[IssueStatus] = None

class IssueStatusSummary(BaseModel):
    open: int
    in_progress: int
    resolved: int
    closed: int
    total: int

class IssueDailyCount(BaseModel):
    date: str
    count: int

class IssueClosedByUser(BaseModel):
    user_id: int
    username: str
    closed_count: int

class IssueCountByBuilding(BaseModel):
    building_id: int
    building_name: str
    issue_count: int

class IssueCountByUser(BaseModel):
    user_id: int
    username: str
    issue_count: int

class VehicleCountByComplex(BaseModel):
    complex_id: int
    complex_name: str
    vehicle_count: int

class VehicleStats(BaseModel):
    total_vehicles: int
    vehicles_by_complex: List[VehicleCountByComplex] = []

class VisitorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    plate_number: Optional[str] = Field(None, min_length=3, max_length=20)

class VisitorCreate(VisitorBase):
    """Schema for creating a visitor. Admin can specify complex_id."""
    complex_id: Optional[int] = Field(None, gt=0, description="Optional: ID of the complex for this visitor (admin only)")

class VisitorOut(VisitorBase):
    id: int
    visit_date: datetime
    complex_id: int
    building_id: int
    user_id: int
    status: VisitorStatus
    status_updated_by: Optional[int]
    status_updated_date: Optional[datetime]
    created_date: datetime
    created_by: Optional[int]

    class Config:
        from_attributes = True

class VisitorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    plate_number: Optional[str] = Field(None, min_length=3, max_length=20)
    visit_date: Optional[datetime] = None

class VisitorStatusUpdate(BaseModel):
    status: VisitorStatus

class VisitorCountByBuilding(BaseModel):
    building_id: int
    building_name: str
    visitor_count: int

class VisitorCountByUser(BaseModel):
    user_id: int
    username: str
    visitor_count: int

class IssueCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class IssueCategoryCreate(IssueCategoryBase):
    """Schema for managers to create a category in their complex."""
    pass

class AdminIssueCategoryCreate(IssueCategoryBase):
    """Schema for admins to create a category in any complex."""
    complex_id: int = Field(..., gt=0)

class IssueCategoryOut(BaseModel):
    id: int
    name: str
    complex_id: int
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True

class IssueCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)

class IssueCountByCategory(BaseModel):
    category_id: int
    category_name: str
    issue_count: int


# Reservation Category Schemas
class ReservationCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class ReservationCategoryCreate(ReservationCategoryBase):
    """Schema for managers to create a reservation category in their complex."""
    pass

class AdminReservationCategoryCreate(ReservationCategoryBase):
    """Schema for admins to create a reservation category in any complex."""
    complex_id: int = Field(..., gt=0)

class ReservationCategoryOut(BaseModel):
    id: int
    name: str
    complex_id: int
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True

class ReservationCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)


# Reservation Schemas
class ReservationBase(BaseModel):
    category_id: int = Field(..., gt=0)
    reservation_date: datetime
    start_hour: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):([0-5][0-9])$")
    end_hour: str = Field(..., pattern="^([01]?[0-9]|2[0-3]):([0-5][0-9])$")
    person_count: int = Field(default=1, gt=0)
    notes: Optional[str] = Field(None, max_length=500)

class ReservationCreate(ReservationBase):
    """Schema for creating a reservation."""
    pass

class AdminReservationCreate(ReservationBase):
    """Schema for admin to create a reservation for any user."""
    user_id: int = Field(..., gt=0)
    complex_id: int = Field(..., gt=0)

class ReservationUpdate(BaseModel):
    category_id: Optional[int] = Field(None, gt=0)
    reservation_date: Optional[datetime] = None
    start_hour: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):([0-5][0-9])$")
    end_hour: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):([0-5][0-9])$")
    person_count: Optional[int] = Field(None, gt=0)
    notes: Optional[str] = Field(None, max_length=500)

class ReservationStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(PENDING|ACCEPTED|REJECTED)$")

class ReservationOverlapStats(BaseModel):
    other_reservations_count: int
    total_people_count: int

class ReservationOverlapStatsById(BaseModel):
    reservation_id: int
    other_accepted_reservations_count: int
    total_people_count: int

class ReservationOut(BaseModel):
    id: int
    category_id: int
    user_id: int
    complex_id: int
    reservation_date: datetime
    start_hour: str
    end_hour: str
    person_count: int
    notes: Optional[str]
    status: str
    status_updated_by: Optional[int]
    status_updated_date: Optional[datetime]
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]

    class Config:
        from_attributes = True


# Marketplace Category Schemas
class MarketplaceCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class MarketplaceCategoryCreate(MarketplaceCategoryBase):
    """Schema for managers to create a marketplace category in their complex."""
    pass


class AdminMarketplaceCategoryCreate(MarketplaceCategoryBase):
    """Schema for admins to create a marketplace category in any complex."""
    complex_id: int = Field(..., gt=0)


class MarketplaceCategoryOut(BaseModel):
    id: int
    name: str
    complex_id: int
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True


class MarketplaceCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)


# Marketplace Item Schemas
class MarketplaceItemImageOut(BaseModel):
    id: int
    img_path: str

    class Config:
        from_attributes = True


class MarketplaceItemBase(BaseModel):
    category_id: int = Field(..., gt=0)
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=5, max_length=1000)
    price: float = Field(..., gt=0)
    img_paths: List[str] = []


class MarketplaceItemCreate(MarketplaceItemBase):
    """Schema for creating a marketplace item."""
    pass


class AdminMarketplaceItemCreate(MarketplaceItemBase):
    """Schema for admin to create a marketplace item in any complex."""
    complex_id: int = Field(..., gt=0)


class MarketplaceItemUpdate(BaseModel):
    category_id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=5, max_length=1000)
    price: Optional[float] = Field(None, gt=0)
    status: Optional[MarketplaceItemStatus] = None
    img_paths: Optional[List[str]] = None
    relist: bool = False  # Set to True to relist an expired item


class MarketplaceItemOut(BaseModel):
    id: int
    category_id: int
    user_id: int
    username: str
    contact: str
    title: str
    description: str
    price: float
    complex_id: int
    status: MarketplaceItemStatus
    listed_date: datetime
    images: List[MarketplaceItemImageOut] = []
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True


# Payment Schemas
class PaymentBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    amount: float = Field(..., gt=0)
    due_date: Optional[datetime] = None


class PaymentCreateForAll(PaymentBase):
    """Schema for creating a payment for ALL units in the manager's complex."""
    pass


class PaymentCreateForSpecific(PaymentBase):
    """Schema for creating a payment for specific unit numbers."""
    unit_numbers: List[str] = Field(..., min_items=1)


class AdminPaymentCreateForAll(PaymentBase):
    """Schema for admin to create a payment for ALL units in any complex."""
    complex_id: int = Field(..., gt=0)


class AdminPaymentCreateForSpecific(PaymentBase):
    """Schema for admin to create a payment for specific unit numbers in any complex."""
    complex_id: int = Field(..., gt=0)
    unit_numbers: List[str] = Field(..., min_items=1)


class PaymentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    due_date: Optional[datetime] = None


class PaymentRecordOut(BaseModel):
    id: int
    payment_id: int
    unit_number: str
    status: PaymentStatus
    paid_date: Optional[datetime]
    created_date: datetime
    updated_date: Optional[datetime]

    class Config:
        from_attributes = True


class PaymentOut(BaseModel):
    id: int
    title: str
    amount: float
    complex_id: int
    target_type: PaymentTargetType
    unit_numbers: List[str] = []
    due_date: Optional[datetime]
    records: List[PaymentRecordOut] = []
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True


class PaymentRecordStatusUpdate(BaseModel):
    status: PaymentStatus


class PaymentStats(BaseModel):
    total_records: int
    pending_count: int
    paid_count: int
    overdue_count: int
    cancelled_count: int
    total_amount: float
    collected_amount: float
    pending_amount: float


class PaymentStatsByBuilding(BaseModel):
    building_id: int
    building_name: str
    total_records: int
    pending_count: int
    paid_count: int
    overdue_count: int
    cancelled_count: int
    total_amount: float
    collected_amount: float
    pending_amount: float


class PaymentRecordInBuilding(BaseModel):
    id: int
    payment_id: int
    payment_title: str
    unit_number: str
    amount: float
    status: PaymentStatus
    due_date: Optional[datetime]
    paid_date: Optional[datetime]


class PaymentsByBuilding(BaseModel):
    building_id: int
    building_name: str
    records: List[PaymentRecordInBuilding]


# Notification schemas
class NotificationType(str):
    PAYMENT_REMINDER = "payment_reminder"
    PAYMENT_CREATED = "payment_created"
    PAYMENT_UPDATED = "payment_updated"
    ANNOUNCEMENT = "announcement"
    ISSUE_UPDATE = "issue_update"
    VISITOR_UPDATE = "visitor_update"
    GENERAL = "general"


class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: Optional[str] = None
    data: Optional[str] = None
    is_read: bool = False
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_date: datetime

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    push_notifications_enabled: Optional[bool] = None
    email_notifications_enabled: Optional[bool] = None
    payment_reminder_days: Optional[int] = None


class ScheduledReminderCreate(BaseModel):
    payment_record_id: int
    reminder_date: datetime
    message: Optional[str] = None
