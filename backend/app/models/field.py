import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Numeric, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.models.base import Base


class Field(Base):
    __tablename__ = "fields"
    __table_args__ = (
        CheckConstraint(
            "verification_status IN ('pending', 'verified', 'rejected')",
            name="chk_field_verification_status"
        ),
        CheckConstraint(
            "(verification_status = 'pending' AND verified_by_id IS NULL AND verified_at IS NULL) OR "
            "(verification_status IN ('verified', 'rejected') AND verified_by_id IS NOT NULL AND verified_at IS NOT NULL)",
            name="chk_field_verification_data"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    farmer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("farmers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    # GeoAlchemy2 MultiPolygon column in WGS 84 (SRID 4326)
    boundary = mapped_column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=True),
        nullable=False
    )
    calculated_area_hectares: Mapped[float] = mapped_column(
        Numeric(10, 4),
        nullable=False
    )
    crop_history_summary: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    verification_status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False
    )
    verified_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    verification_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    project = relationship("Project", back_populates="fields")
    farmer = relationship("Farmer", back_populates="fields")
    
    creator = relationship("User", foreign_keys=[created_by_id], back_populates="created_fields")
    verifier = relationship("User", foreign_keys=[verified_by_id], back_populates="verified_fields")

    zones = relationship("FieldZone", back_populates="field", cascade="all, delete-orphan")
    resources = relationship("Resource", back_populates="field")
    reference_points = relationship("ReferencePoint", back_populates="field")
    observations = relationship("Observation", back_populates="field")
    photos = relationship("Photo", back_populates="field")
    devices = relationship("Device", back_populates="field", foreign_keys="Device.field_id")
    sensor_readings = relationship("SensorData", back_populates="field", foreign_keys="SensorData.field_id")
