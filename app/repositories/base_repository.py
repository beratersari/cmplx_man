from typing import TypeVar, Generic, Type, List, Optional, Any
from sqlalchemy.orm import Session

ModelType = TypeVar("ModelType")

class BaseRepository(Generic[ModelType]):
    """Base repository providing common CRUD operations."""
    
    def __init__(self, db: Session, model: Type[ModelType]):
        self.db = db
        self.model = model
    
    def get_by_id(self, id: int) -> Optional[ModelType]:
        """Get a single record by ID."""
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def get_all(self, skip: int = 0, limit: int = 50) -> List[ModelType]:
        """Get all records with pagination."""
        return self.db.query(self.model).offset(skip).limit(limit).all()
    
    def create(self, obj_in: dict, created_by: Optional[int] = None) -> ModelType:
        """Create a new record."""
        if created_by is not None and hasattr(self.model, 'created_by'):
            obj_in['created_by'] = created_by
        
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def update(self, db_obj: ModelType, obj_in: dict, updated_by: Optional[int] = None) -> ModelType:
        """Update an existing record."""
        for key, value in obj_in.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)
        
        if updated_by is not None and hasattr(db_obj, 'updated_by'):
            setattr(db_obj, 'updated_by', updated_by)
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def delete(self, db_obj: ModelType) -> None:
        """Delete a record."""
        self.db.delete(db_obj)
        self.db.commit()
    
    def exists(self, id: int) -> bool:
        """Check if a record exists."""
        return self.db.query(self.model).filter(self.model.id == id).first() is not None
