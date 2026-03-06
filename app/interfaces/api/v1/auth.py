from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.infrastructure.database import get_db
from app.use_cases.auth_service import AuthService
from app.infrastructure.logging_config import logger
from .schemas import Token

router = APIRouter()

# Access: Public (no auth). Issues JWT on valid credentials.
@router.post("/login", response_model=Token, summary="User Login", description="Authenticates a user with username and password, returning a JWT access token. No authentication required.")
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    logger.info(f"Login attempt for user: {form_data.username}")
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        logger.warning(f"Failed login attempt for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    logger.info(f"Successful login for user: {form_data.username}")
    access_token = auth_service.create_token(user)
    return {"access_token": access_token, "token_type": "bearer"}
