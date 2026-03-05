from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.infrastructure.database import get_db
from app.infrastructure.models import AnnouncementModel, ResidentialComplexModel, UserModel, AnnouncementEmotionModel, CommentModel, CommentEmotionModel
from app.domain.entities import UserRole
from app.interfaces.api.deps import get_current_user, RoleChecker
from .schemas import AnnouncementCreate, AnnouncementOut, EmotionCreate, EmotionCount, CommentCreate, CommentOut, UserReaction

router = APIRouter()

@router.post("/", response_model=AnnouncementOut)
def create_announcement(
    announcement_in: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Check complex exists
    complex_obj = db.query(ResidentialComplexModel).filter(ResidentialComplexModel.id == announcement_in.complex_id).first()
    if not complex_obj:
        raise HTTPException(status_code=404, detail="Residential complex not found")

    # Authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.SITE_MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins and site managers can create announcements")
    
    if current_user.role == UserRole.SITE_MANAGER:
        if complex_obj not in current_user.assigned_complexes:
            raise HTTPException(status_code=403, detail="You can only create announcements for your assigned complexes")

    new_announcement = AnnouncementModel(
        title=announcement_in.title,
        description=announcement_in.description,
        img_path=announcement_in.img_path,
        complex_id=announcement_in.complex_id,
        comments_enabled=announcement_in.comments_enabled,
        created_by=current_user.id
    )
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    return new_announcement

def get_comment_tree(db: Session, announcement_id: int, parent_id: int = None) -> List[CommentOut]:
    comments = db.query(CommentModel).filter(
        CommentModel.announcement_id == announcement_id,
        CommentModel.parent_id == parent_id
    ).all()
    
    result = []
    for c in comments:
        # Get emotions for comment
        emotion_counts = db.query(
            CommentEmotionModel.emoji, 
            func.count(CommentEmotionModel.id).label('count')
        ).filter(CommentEmotionModel.comment_id == c.id).group_by(CommentEmotionModel.emoji).all()
        
        # Get creator username
        creator = db.query(UserModel).filter(UserModel.id == c.created_by).first()
        
        c_out = CommentOut(
            id=c.id,
            content=c.content,
            announcement_id=c.announcement_id,
            parent_id=c.parent_id,
            created_date=c.created_date,
            created_by=c.created_by,
            username=creator.username if creator else "Unknown",
            emotion_counts=[EmotionCount(emoji=e.emoji, count=e.count) for e in emotion_counts],
            replies=get_comment_tree(db, announcement_id, c.id)
        )
        result.append(c_out)
    return result

@router.get("/", response_model=List[AnnouncementOut])
def read_announcements(
    complex_id: int = None,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = db.query(AnnouncementModel)
    if complex_id:
        query = query.filter(AnnouncementModel.complex_id == complex_id)
    
    announcements = query.all()
    
    # Filter by user's complexes
    if current_user.role == UserRole.ADMIN:
        pass
    else:
        # Residents and others only see announcements for complexes they belong to
        assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
        
        # If user is a resident, they might be linked via buildings
        if current_user.role == UserRole.SITE_RESIDENT:
            building_complex_ids = [b.complex_id for b in current_user.assigned_buildings]
            assigned_complex_ids = list(set(assigned_complex_ids + building_complex_ids))
            
        announcements = [a for a in announcements if a.complex_id in assigned_complex_ids]

    result = []
    for a in announcements:
        # Get emotion counts
        emotion_counts = db.query(
            AnnouncementEmotionModel.emoji, 
            func.count(AnnouncementEmotionModel.id).label('count')
        ).filter(AnnouncementEmotionModel.announcement_id == a.id).group_by(AnnouncementEmotionModel.emoji).all()
        
        # Get detailed reactions
        reactions = db.query(AnnouncementEmotionModel).filter(
            AnnouncementEmotionModel.announcement_id == a.id
        ).all()
        user_reactions = []
        for r in reactions:
            user = db.query(UserModel).filter(UserModel.id == r.user_id).first()
            if user:
                user_reactions.append(UserReaction(user_id=user.id, username=user.username, emoji=r.emoji))
        
        a_out = AnnouncementOut.from_orm(a)
        a_out.emotion_counts = [EmotionCount(emoji=e.emoji, count=e.count) for e in emotion_counts]
        a_out.user_reactions = user_reactions
        a_out.comments = get_comment_tree(db, a.id)
        result.append(a_out)
        
    return result

@router.post("/{announcement_id}/emotions")
def react_to_announcement(
    announcement_id: int,
    emotion_in: EmotionCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if current_user.role != UserRole.ADMIN:
        assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
        if announcement.complex_id not in assigned_complex_ids:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    existing_emotion = db.query(AnnouncementEmotionModel).filter(
        AnnouncementEmotionModel.announcement_id == announcement_id,
        AnnouncementEmotionModel.user_id == current_user.id
    ).first()

    if existing_emotion:
        existing_emotion.emoji = emotion_in.emoji
    else:
        new_emotion = AnnouncementEmotionModel(
            announcement_id=announcement_id,
            user_id=current_user.id,
            emoji=emotion_in.emoji
        )
        db.add(new_emotion)
    
    db.commit()
    return {"message": "Reaction recorded"}

@router.get("/{announcement_id}/reactions", response_model=List[UserReaction])
def get_announcement_reactions(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    reactions = db.query(AnnouncementEmotionModel).filter(
        AnnouncementEmotionModel.announcement_id == announcement_id
    ).all()
    
    result = []
    for r in reactions:
        user = db.query(UserModel).filter(UserModel.id == r.user_id).first()
        if user:
            result.append(UserReaction(user_id=user.id, username=user.username, emoji=r.emoji))
    return result

@router.put("/{announcement_id}", response_model=AnnouncementOut)
def update_announcement(
    announcement_id: int,
    announcement_in: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    # Authorization
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.SITE_MANAGER:
        if announcement.complex_id not in [c.id for c in current_user.assigned_complexes]:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    else:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    announcement.title = announcement_in.title
    announcement.description = announcement_in.description
    announcement.img_path = announcement_in.img_path
    announcement.comments_enabled = announcement_in.comments_enabled
    announcement.updated_by = current_user.id
    
    db.commit()
    db.refresh(announcement)
    return announcement

@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    # Authorization
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.SITE_MANAGER:
        if announcement.complex_id not in [c.id for c in current_user.assigned_complexes]:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    else:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    db.delete(announcement)
    db.commit()
    return {"message": "Announcement deleted successfully"}

@router.post("/{announcement_id}/comments", response_model=CommentOut)
def create_comment(
    announcement_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    if not announcement.comments_enabled:
        raise HTTPException(status_code=400, detail="Comments are disabled for this announcement")

    if current_user.role != UserRole.ADMIN:
        assigned_complex_ids = [c.id for c in current_user.assigned_complexes]
        if announcement.complex_id not in assigned_complex_ids:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    if comment_in.parent_id:
        parent = db.query(CommentModel).filter(CommentModel.id == comment_in.parent_id).first()
        if not parent or parent.announcement_id != announcement_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    new_comment = CommentModel(
        content=comment_in.content,
        announcement_id=announcement_id,
        parent_id=comment_in.parent_id,
        created_by=current_user.id
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    return CommentOut(
        id=new_comment.id,
        content=new_comment.content,
        announcement_id=new_comment.announcement_id,
        parent_id=new_comment.parent_id,
        created_date=new_comment.created_date,
        created_by=new_comment.created_by,
        username=current_user.username,
        emotion_counts=[],
        replies=[]
    )

@router.post("/comments/{comment_id}/emotions")
def react_to_comment(
    comment_id: int,
    emotion_in: EmotionCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    comment = db.query(CommentModel).filter(CommentModel.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    existing_emotion = db.query(CommentEmotionModel).filter(
        CommentEmotionModel.comment_id == comment_id,
        CommentEmotionModel.user_id == current_user.id
    ).first()

    if existing_emotion:
        existing_emotion.emoji = emotion_in.emoji
    else:
        new_emotion = CommentEmotionModel(
            comment_id=comment_id,
            user_id=current_user.id,
            emoji=emotion_in.emoji
        )
        db.add(new_emotion)
    
    db.commit()
    return {"message": "Reaction recorded"}

@router.get("/comments/{comment_id}/reactions", response_model=List[UserReaction])
def get_comment_reactions(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    reactions = db.query(CommentEmotionModel).filter(
        CommentEmotionModel.comment_id == comment_id
    ).all()
    
    result = []
    for r in reactions:
        user = db.query(UserModel).filter(UserModel.id == r.user_id).first()
        if user:
            result.append(UserReaction(user_id=user.id, username=user.username, emoji=r.emoji))
    return result

@router.put("/comments/{comment_id}", response_model=CommentOut)
def update_comment(
    comment_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    comment = db.query(CommentModel).filter(CommentModel.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Only creator can edit
    if comment.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can edit this comment")

    comment.content = comment_in.content
    comment.updated_by = current_user.id
    
    # Reset reactions on edit
    db.query(CommentEmotionModel).filter(CommentEmotionModel.comment_id == comment_id).delete()
    
    db.commit()
    db.refresh(comment)
    
    return CommentOut(
        id=comment.id,
        content=comment.content,
        announcement_id=comment.announcement_id,
        parent_id=comment.parent_id,
        created_date=comment.created_date,
        created_by=comment.created_by,
        username=current_user.username,
        emotion_counts=[],
        replies=[]
    )

@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    comment = db.query(CommentModel).filter(CommentModel.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Authorization: creator, admin, or manager of the complex
    is_authorized = False
    if comment.created_by == current_user.id or current_user.role == UserRole.ADMIN:
        is_authorized = True
    elif current_user.role == UserRole.SITE_MANAGER:
        announcement = db.query(AnnouncementModel).filter(AnnouncementModel.id == comment.announcement_id).first()
        if announcement and announcement.complex_id in [c.id for c in current_user.assigned_complexes]:
            is_authorized = True
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted successfully"}

@router.delete("/{announcement_id}/emotions")
def remove_announcement_reaction(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    emotion = db.query(AnnouncementEmotionModel).filter(
        AnnouncementEmotionModel.announcement_id == announcement_id,
        AnnouncementEmotionModel.user_id == current_user.id
    ).first()
    
    if not emotion:
        raise HTTPException(status_code=404, detail="Reaction not found")
    
    db.delete(emotion)
    db.commit()
    return {"message": "Reaction removed"}

@router.delete("/comments/{comment_id}/emotions")
def remove_comment_reaction(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    emotion = db.query(CommentEmotionModel).filter(
        CommentEmotionModel.comment_id == comment_id,
        CommentEmotionModel.user_id == current_user.id
    ).first()
    
    if not emotion:
        raise HTTPException(status_code=404, detail="Reaction not found")
    
    db.delete(emotion)
    db.commit()
    return {"message": "Reaction removed"}
