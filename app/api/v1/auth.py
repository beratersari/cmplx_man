from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.core.database import get_db
from app.services import AuthService
from app.core.logging_config import logger
from app.core.security import SECRET_KEY, ALGORITHM, create_access_token, decode_access_token
from .schemas import Token

router = APIRouter()
security = HTTPBearer()


@router.post("/login", response_model=Token, summary="User Login", description="Authenticates a user with username and password, returning a JWT access token. No authentication required.")
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user and return JWT token."""
    logger.info(f"Login attempt for user: {form_data.username}")
    
    service = AuthService(db)
    user = service.authenticate_user(form_data.username, form_data.password)
    
    if not user:
        logger.warning(f"Failed login attempt for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"Successful login for user: {form_data.username}")
    access_token = service.create_token(user)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh", response_model=Token, summary="Refresh Token", description="Refreshes an expired access token using the current token. Requires valid bearer token.")
def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Refresh the access token using the current valid token."""
    token = credentials.credentials
    
    try:
        # Decode the current token (even if expired, we can use it to get user info)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        username = payload.get("sub")
        
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify user still exists and is active
        service = AuthService(db)
        user = service.get_user_by_username(username)
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Token refreshed for user: {username}")
        new_access_token = service.create_token(user)
        return {"access_token": new_access_token, "token_type": "bearer"}
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
