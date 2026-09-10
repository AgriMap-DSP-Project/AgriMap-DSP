"""
AgriMap DSP — Device Registry Model
Tracks GPS receivers, soil sensors, weather stations, cameras, drones.
Kept separate from field/map data as per DSP architecture.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_name: Mapped[str] = mapped_column(String(200), nullable=False)
    device_type: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="gps_receiver, soil_sensor, weather_station, camera, drone, other"
    )
    serial_number: Mapped[Optional[str]] = mapped_column(String(200), unique=True, nullable=True)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    model_number: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Link to a field (optional — device may not be assigned yet)
    field_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("fields.id", ondelete="SET NULL"), nullable=True)

    # Status tracking
    status: Mapped[str] = mapped_column(String(50), default="active", comment="active, inactive, maintenance, retired")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Flexible metadata (firmware version, calibration data, etc.)
    device_metadata: Mapped[dict] = mapped_column("device_metadata", JSONB, default=dict, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Ownership
    registered_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    sensor_readings = relationship("SensorData", back_populates="device", cascade="all, delete-orphan")
    field = relationship("Field", back_populates="devices")

    def __repr__(self):
        return f"<Device {self.device_name} ({self.device_type})>"
