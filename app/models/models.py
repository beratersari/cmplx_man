from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.core.entities import UserRole, IssueStatus

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

    assigned_complexes = relationship("ResidentialComplexModel", secondary=complex_assignments, back_populates="assigned_users")
    assigned_buildings = relationship("BuildingModel", secondary=building_assignments, back_populates="residents")
    vehicles = relationship("VehicleModel", back_populates="user", cascade="all, delete-orphan")
    announcement_emotions = relationship("AnnouncementEmotionModel", back_populates="user")
    comment_emotions = relationship("CommentEmotionModel", back_populates="user")
    issues = relationship("IssueModel", back_populates="user")

class IssueModel(Base, AuditMixin):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(SQLEnum(IssueStatus), default=IssueStatus.OPEN)

    complex = relationship("ResidentialComplexModel", back_populates="issues")
    user = relationship("UserModel", back_populates="issues")
    images = relationship("IssueImageModel", back_populates="issue", cascade="all, delete-orphan")

class IssueImageModel(Base):
    __tablename__ = "issue_images"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"))
    img_path = Column(String)

    issue = relationship("IssueModel", back_populates="images")
