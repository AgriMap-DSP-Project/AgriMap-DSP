import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class FarmerBase(BaseModel):
    full_name: str = Field(..., max_length=255)
    contact_number: str = Field(..., max_length=50)
    email: Optional[EmailStr] = None
    address: Optional[str] = None


class FarmerCreate(FarmerBase):
    password: Optional[str] = Field(
        None,
        min_length=8,
        max_length=128,
        description="If set, creates a farmer login linked to this profile.",
    )


class FarmerUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    contact_number: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    address: Optional[str] = None


class FarmerRead(FarmerBase):
    id: uuid.UUID
    has_login: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "22222222-2222-2222-2222-222222222222",
                "full_name": "Yiannis Georgiou",
                "contact_number": "+30 210 1234567",
                "email": "yiannis.georgiou@fictionalfarm.gr",
                "address": "Marousi, Athens, Greece",
                "created_at": "2026-08-14T12:00:00Z",
                "updated_at": "2026-08-14T12:00:00Z"
            }
        }
    )

