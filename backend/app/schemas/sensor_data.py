"""
AgriMap DSP — Sensor Data Schemas
"""
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class SensorDataBase(BaseModel):
    device_id: uuid.UUID
    field_id: Optional[uuid.UUID] = None
    sensor_type: str = Field(..., description="soil_moisture, soil_ph, temperature, humidity, rainfall, wind_speed, light_intensity, ndvi, other")
    value: float
    unit: str = Field(..., max_length=50, description="%, °C, mm, m/s, lux, etc.")
    geom: Optional[Dict[str, Any]] = Field(None, description="GeoJSON Point where reading was taken")
    measured_at: datetime
    raw_payload: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class SensorDataCreate(SensorDataBase):
    pass


class SensorDataBulkCreate(BaseModel):
    """For submitting multiple readings at once from a device."""
    device_id: uuid.UUID
    readings: list[SensorDataCreate]


class SensorDataRead(BaseModel):
    id: uuid.UUID
    device_id: uuid.UUID
    field_id: Optional[uuid.UUID] = None
    sensor_type: str
    value: float
    unit: str
    measured_at: datetime
    raw_payload: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
