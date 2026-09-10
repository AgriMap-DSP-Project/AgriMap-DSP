"""
AgriMap DSP — Security Module
JWT authentication, password hashing, and current user dependency.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

# OAuth2 scheme — tells FastAPI to look for Bearer token in Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: uuid.UUID, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with user_id and role claims."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency that extracts and validates the current user from
    the JWT Bearer token. Use as: current_user: User = Depends(get_current_user)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    return user


def get_optional_current_user(
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication — returns None if no token provided.
    Useful for endpoints that work both authenticated and unauthenticated.
    """
    if token is None:
        return None
    try:
        return get_current_user(token, db)
    except HTTPException:
        return None
