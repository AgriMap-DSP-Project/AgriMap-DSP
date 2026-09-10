import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    email: str = Field(..., max_length=255)
    full_name: str = Field(..., max_length=255)
    role: str = Field(..., description="Must be one of: admin, surveyor, verifier, farmer")
    farmer_id: Optional[uuid.UUID] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserUpdate(BaseModel):
    email: Optional[str] = Field(None, max_length=255)
    full_name: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)


class UserRead(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "surveyor@agrilythos.com",
                "full_name": "Nikos Georgiou",
                "role": "surveyor",
                "is_active": True,
                "created_at": "2026-08-14T12:00:00Z",
                "updated_at": "2026-08-14T12:00:00Z"
            }
        }
    )

