from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class UserRole(str, Enum):
    ADMIN = "admin"
    SITE_MANAGER = "site_manager"
    SITE_ATTENDANT = "site_attendant"
    SITE_RESIDENT = "site_resident"

class IssueStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class AuditBase(BaseModel):
    created_date: datetime = datetime.utcnow()
    created_by: Optional[int] = None
    updated_date: Optional[datetime] = None
    updated_by: Optional[int] = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)

class ResidentialComplex(AuditBase):
    id: Optional[int] = None
    name: str
    address: str

class Building(AuditBase):
    id: Optional[int] = None
    name: str
    complex_id: int

class Announcement(AuditBase):
    id: Optional[int] = None
    title: str
    description: str
    img_path: Optional[str] = None
    complex_id: int
    comments_enabled: bool = True

class Comment(AuditBase):
    id: Optional[int] = None
    content: str
    announcement_id: int
    parent_id: Optional[int] = None  # For tree structure
    replies: List['Comment'] = []

class Emotion(BaseModel):
    id: Optional[int] = None
    user_id: int
    emoji: str
    username: Optional[str] = None  # To show who reacted

class User(AuditBase):
    id: Optional[int] = None
    username: str
    email: str
    hashed_password: str
    role: UserRole
    contact: Optional[str] = None
    description: Optional[str] = None

class Vehicle(AuditBase):
    id: Optional[int] = None
    user_id: int
    plate_number: str
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None

class Visitor(AuditBase):
    id: Optional[int] = None
    name: str
    plate_number: Optional[str] = None
    visit_date: datetime
    complex_id: int
    user_id: int
