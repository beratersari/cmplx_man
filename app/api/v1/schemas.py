from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.core.entities import UserRole, IssueStatus

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
    complex_ids: Optional[List[int]] = None
    building_ids: Optional[List[int]] = None

class UserOut(UserBase):
    id: int
    created_date: datetime
    created_by: Optional[int]
    updated_date: Optional[datetime]
    updated_by: Optional[int]

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
    pass

class VisitorOut(VisitorBase):
    id: int
    visit_date: datetime
    complex_id: int
    building_id: int
    user_id: int
    created_date: datetime
    created_by: Optional[int]

    class Config:
        from_attributes = True

class VisitorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    plate_number: Optional[str] = Field(None, min_length=3, max_length=20)
    visit_date: Optional[datetime] = None

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
