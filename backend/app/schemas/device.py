"""
AgriMap DSP — Device Schemas
"""
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class DeviceBase(BaseModel):
    device_name: str = Field(..., max_length=200)
    device_type: str = Field(..., description="gps_receiver, soil_sensor, weather_station, camera, drone, other")
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    field_id: Optional[uuid.UUID] = None
    status: str = "active"
    is_active: bool = True
    device_metadata: Dict[str, Any] = Field(default_factory=dict)
    description: Optional[str] = None


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    field_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    device_metadata: Optional[Dict[str, Any]] = None
    description: Optional[str] = None


class DeviceRead(DeviceBase):
    id: uuid.UUID
    registered_by_id: Optional[uuid.UUID] = None
    last_seen_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
