"""Field and farmer access helpers."""
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.farmer import Farmer
from app.models.field import Field
from app.models.user import User

STAFF_ROLES = ("admin", "surveyor", "verifier")
MUTATION_ROLES = ("admin", "surveyor")


def linked_farmer(db: Session, user: User) -> Optional[Farmer]:
    if user.farmer_id:
        return db.get(Farmer, user.farmer_id)
    if user.email:
        return db.query(Farmer).filter(Farmer.email == user.email).first()
    return None


def ensure_staff(user: User) -> None:
    if user.role not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action is limited to staff accounts.",
        )


def ensure_can_mutate(user: User) -> None:
    if user.role not in MUTATION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and surveyors can create or change this data.",
        )


def ensure_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can perform this action.",
        )


def ensure_field_access(db: Session, user: User, field: Field) -> None:
    if user.role in STAFF_ROLES:
        return
    farmer = linked_farmer(db, user)
    if not farmer or field.farmer_id != farmer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view land assigned to your farmer profile.",
        )


def farmer_scope_id(db: Session, user: User) -> Optional[uuid.UUID]:
    if user.role != "farmer":
        return None
    farmer = linked_farmer(db, user)
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No farmer profile is linked to this login. Contact an administrator.",
        )
    return farmer.id
