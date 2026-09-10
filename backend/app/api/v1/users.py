"""
AgriMap DSP — Users API Endpoints
User management CRUD operations.
"""
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new user. Requires admin role.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create users."
        )
    
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists."
        )
    
    db_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=user_data.is_active,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    logger.info("Admin %s created user: %s", current_user.email, db_user.email)
    return db_user


@router.get("/", response_model=dict)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    role: str = Query(None, description="Filter by role"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all users with optional role filter. Paginated.
    """
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    
    return {
        "items": [UserRead.model_validate(u) for u in users],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a single user by ID.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: uuid.UUID,
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a user. Admins can update anyone; non-admins can only update themselves.
    """
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile."
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Hash password if being updated
    if "password" in update_dict:
        update_dict["password_hash"] = hash_password(update_dict.pop("password"))
    
    for key, value in update_dict.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    logger.info("User updated: %s by %s", user.email, current_user.email)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a user. Requires admin role.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete users."
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    logger.info("Admin %s deleted user: %s", current_user.email, user.email)
