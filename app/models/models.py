from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.core.entities import UserRole, IssueStatus, ReservationStatus, MarketplaceItemStatus, VisitorStatus, PaymentStatus, PaymentTargetType

class AuditMixin:
    created_date = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    updated_date = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    updated_by = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)

# Association table for Managers/Attendants to Residential Complexes
complex_assignments = Table(
    "complex_assignments",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("complex_id", Integer, ForeignKey("residential_complexes.id"), primary_key=True),
)

# Association table for Residents to Buildings
building_assignments = Table(
    "building_assignments",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("building_id", Integer, ForeignKey("buildings.id"), primary_key=True),
)

class ResidentialComplexModel(Base, AuditMixin):
    __tablename__ = "residential_complexes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    address = Column(String)

    buildings = relationship("BuildingModel", back_populates="complex")
    assigned_users = relationship("UserModel", secondary=complex_assignments, back_populates="assigned_complexes")
    announcements = relationship("AnnouncementModel", back_populates="complex")
    issues = relationship("IssueModel", back_populates="complex")
    visitors = relationship("VisitorModel", back_populates="complex")
    issue_categories = relationship("IssueCategoryModel", back_populates="complex")
    reservation_categories = relationship("ReservationCategoryModel", back_populates="complex")
    reservations = relationship("ReservationModel", back_populates="complex")
    marketplace_categories = relationship("MarketplaceCategoryModel", back_populates="complex")
    marketplace_items = relationship("MarketplaceItemModel", back_populates="complex")
    payments = relationship("PaymentModel", back_populates="complex")

class AnnouncementModel(Base, AuditMixin):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    img_path = Column(String, nullable=True)
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))
    comments_enabled = Column(Boolean, default=True)

    complex = relationship("ResidentialComplexModel", back_populates="announcements")
    emotions = relationship("AnnouncementEmotionModel", back_populates="announcement")
    comments = relationship("CommentModel", back_populates="announcement")
    reads = relationship("AnnouncementReadModel", back_populates="announcement", cascade="all, delete-orphan")

class AnnouncementReadModel(Base):
    __tablename__ = "announcement_reads"

    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    read_date = Column(DateTime, default=datetime.utcnow)

    announcement = relationship("AnnouncementModel", back_populates="reads")
    user = relationship("UserModel", back_populates="announcement_reads")

class AnnouncementEmotionModel(Base):
    __tablename__ = "announcement_emotions"

    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    emoji = Column(String)

    announcement = relationship("AnnouncementModel", back_populates="emotions")
    user = relationship("UserModel", back_populates="announcement_emotions")

class CommentModel(Base, AuditMixin):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    announcement_id = Column(Integer, ForeignKey("announcements.id"))
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)

    announcement = relationship("AnnouncementModel", back_populates="comments")
    parent = relationship("CommentModel", remote_side=[id], back_populates="replies")
    replies = relationship("CommentModel", back_populates="parent", cascade="all, delete-orphan")
    emotions = relationship("CommentEmotionModel", back_populates="comment")

class CommentEmotionModel(Base):
    __tablename__ = "comment_emotions"

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    emoji = Column(String)

    comment = relationship("CommentModel", back_populates="emotions")
    user = relationship("UserModel", back_populates="comment_emotions")

class BuildingModel(Base, AuditMixin):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))

    complex = relationship("ResidentialComplexModel", back_populates="buildings")
    residents = relationship("UserModel", secondary=building_assignments, back_populates="assigned_buildings")

class VehicleModel(Base, AuditMixin):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    plate_number = Column(String, unique=True, index=True)
    make = Column(String, nullable=True)
    model = Column(String, nullable=True)
    color = Column(String, nullable=True)

    user = relationship("UserModel", back_populates="vehicles")

class UserModel(Base, AuditMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(SQLEnum(UserRole), default=UserRole.SITE_RESIDENT)
    contact = Column(String, nullable=True)
    description = Column(String, nullable=True)
    unit_number = Column(String, nullable=True)  # Unit/Apartment number where user lives

    assigned_complexes = relationship("ResidentialComplexModel", secondary=complex_assignments, back_populates="assigned_users")
    assigned_buildings = relationship("BuildingModel", secondary=building_assignments, back_populates="residents")
    vehicles = relationship("VehicleModel", back_populates="user", cascade="all, delete-orphan")
    announcement_emotions = relationship("AnnouncementEmotionModel", back_populates="user")
    comment_emotions = relationship("CommentEmotionModel", back_populates="user")
    announcement_reads = relationship("AnnouncementReadModel", back_populates="user")
    issues = relationship("IssueModel", back_populates="user")
    visitors = relationship("VisitorModel", back_populates="user")
    reservations = relationship("ReservationModel", back_populates="user")
    marketplace_items = relationship("MarketplaceItemModel", back_populates="user")
    payment_records = relationship("PaymentRecordModel", back_populates="user")

class IssueModel(Base, AuditMixin):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))
    building_id = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("issue_categories.id"), nullable=False)
    status = Column(SQLEnum(IssueStatus), default=IssueStatus.OPEN)

    complex = relationship("ResidentialComplexModel", back_populates="issues")
    user = relationship("UserModel", back_populates="issues")
    issue_category = relationship("IssueCategoryModel", back_populates="issues")
    images = relationship("IssueImageModel", back_populates="issue", cascade="all, delete-orphan")

class IssueImageModel(Base):
    __tablename__ = "issue_images"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"))
    img_path = Column(String)

    issue = relationship("IssueModel", back_populates="images")

class VisitorModel(Base, AuditMixin):
    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    plate_number = Column(String, nullable=True)
    visit_date = Column(DateTime, nullable=False)
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))
    building_id = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(SQLEnum(VisitorStatus), default=VisitorStatus.PENDING)
    status_updated_by = Column(Integer, nullable=True)
    status_updated_date = Column(DateTime, nullable=True)

    complex = relationship("ResidentialComplexModel", back_populates="visitors")
    user = relationship("UserModel", back_populates="visitors")

class IssueCategoryModel(Base, AuditMixin):
    __tablename__ = "issue_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))

    complex = relationship("ResidentialComplexModel", back_populates="issue_categories")
    issues = relationship("IssueModel", back_populates="issue_category")


class ReservationCategoryModel(Base, AuditMixin):
    __tablename__ = "reservation_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))

    complex = relationship("ResidentialComplexModel", back_populates="reservation_categories")
    reservations = relationship("ReservationModel", back_populates="category")


class ReservationModel(Base, AuditMixin):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("reservation_categories.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))
    reservation_date = Column(DateTime, nullable=False)
    start_hour = Column(String, nullable=False)  # Format: "HH:MM"
    end_hour = Column(String, nullable=False)    # Format: "HH:MM"
    person_count = Column(Integer, default=1)
    notes = Column(String, nullable=True)
    status = Column(SQLEnum(ReservationStatus), default=ReservationStatus.PENDING)
    status_updated_by = Column(Integer, nullable=True)
    status_updated_date = Column(DateTime, nullable=True)

    category = relationship("ReservationCategoryModel", back_populates="reservations")
    user = relationship("UserModel", back_populates="reservations")
    complex = relationship("ResidentialComplexModel", back_populates="reservations")


class MarketplaceCategoryModel(Base, AuditMixin):
    __tablename__ = "marketplace_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))

    complex = relationship("ResidentialComplexModel", back_populates="marketplace_categories")
    items = relationship("MarketplaceItemModel", back_populates="category")


class MarketplaceItemModel(Base, AuditMixin):
    __tablename__ = "marketplace_items"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("marketplace_categories.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    username = Column(String, nullable=False)
    contact = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    price = Column(Integer, nullable=False)  # Stored as cents to avoid floating point issues
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))
    status = Column(SQLEnum(MarketplaceItemStatus), default=MarketplaceItemStatus.AVAILABLE)
    listed_date = Column(DateTime, default=datetime.utcnow)  # For tracking 30-day expiration

    category = relationship("MarketplaceCategoryModel", back_populates="items")
    user = relationship("UserModel", back_populates="marketplace_items")
    complex = relationship("ResidentialComplexModel", back_populates="marketplace_items")
    images = relationship("MarketplaceItemImageModel", back_populates="item", cascade="all, delete-orphan")


class MarketplaceItemImageModel(Base):
    __tablename__ = "marketplace_item_images"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("marketplace_items.id"))
    img_path = Column(String, nullable=False)

    item = relationship("MarketplaceItemModel", back_populates="images")


class PaymentModel(Base, AuditMixin):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)  # Stored as cents to avoid floating point issues
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))
    target_type = Column(SQLEnum(PaymentTargetType), default=PaymentTargetType.ALL)
    unit_numbers = Column(String, nullable=True)  # Comma-separated unit numbers for SPECIFIC target
    due_date = Column(DateTime, nullable=True)

    complex = relationship("ResidentialComplexModel", back_populates="payments")
    records = relationship("PaymentRecordModel", back_populates="payment", cascade="all, delete-orphan")


class PaymentRecordModel(Base, AuditMixin):
    __tablename__ = "payment_records"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    unit_number = Column(String, nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    paid_date = Column(DateTime, nullable=True)

    payment = relationship("PaymentModel", back_populates="records")
    user = relationship("UserModel", back_populates="payment_records")
