import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ProjectBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    status: str = Field("planning", description="Must be one of: planning, active, completed, archived")
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectRead(ProjectBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "11111111-1111-1111-1111-111111111111",
                "name": "Agrilythos Pre-Assessment Phase 1",
                "description": "DSP Digital Land Mapping Pre-Assessment pilot campaign",
                "status": "active",
                "start_date": "2026-08-01",
                "end_date": "2026-10-31",
                "created_at": "2026-08-14T12:00:00Z",
                "updated_at": "2026-08-14T12:00:00Z"
            }
        }
    )

