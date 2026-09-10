"""
AgriMap DSP — Sensor Data Model
Stores IoT sensor readings from field devices.
KEPT SEPARATE from field/map data as per DSP architecture.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry

from app.models.base import Base


class SensorData(Base):
    __tablename__ = "sensor_data"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Link to source device
    device_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)

    # Link to field (where reading was taken)
    field_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("fields.id", ondelete="SET NULL"), nullable=True)

    # Sensor reading
    sensor_type: Mapped[str] = mapped_column(
        String(100), nullable=False,
        comment="soil_moisture, soil_ph, temperature, humidity, rainfall, wind_speed, light_intensity, ndvi, other"
    )
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False, comment="%, °C, mm, m/s, lux, etc.")

    # Location of reading (POINT geometry, SRID 4326)
    geom = mapped_column(Geometry("POINT", srid=4326), nullable=True)

    # When was the reading taken (device time)
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Raw device payload for debugging/audit
    raw_payload: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict, nullable=True)

    # Optional notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Record timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    device = relationship("Device", back_populates="sensor_readings")
    field = relationship("Field", back_populates="sensor_readings")

    def __repr__(self):
        return f"<SensorData {self.sensor_type}={self.value}{self.unit} @{self.measured_at}>"
