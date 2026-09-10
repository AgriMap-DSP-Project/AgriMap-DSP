import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.models.base import Base


class Resource(Base):
    __tablename__ = "resources"
    __table_args__ = (
        CheckConstraint(
            "resource_class IN ('WATER', 'POWER', 'IRRIGATION', 'STRUCTURE', 'OTHER')",
            name="chk_resource_class"
        ),
        CheckConstraint(
            "status IN ('EXISTING', 'UNAVAILABLE', 'NEEDS_VERIFICATION')",
            name="chk_resource_status"
        ),
        CheckConstraint(
            "verification_status IN ('pending', 'verified', 'rejected')",
            name="chk_resource_verification_status"
        ),
        CheckConstraint(
            "(verification_status = 'pending' AND verified_by_id IS NULL AND verified_at IS NULL) OR "
            "(verification_status IN ('verified', 'rejected') AND verified_by_id IS NOT NULL AND verified_at IS NOT NULL)",
            name="chk_resource_verification_data"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    field_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("fields.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    resource_class: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    resource_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    # Generic PostGIS Geometry column in WGS 84 (SRID 4326) to store Point, LineString, or Polygon
    geom = mapped_column(
        Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True),
        nullable=False
    )
    # Flexible JSONB field to capture class-specific parameters
    attributes: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default='{}',
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="NEEDS_VERIFICATION",
        nullable=False
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
    project = relationship("Project", back_populates="resources")
    field = relationship("Field", back_populates="resources")
    
    creator = relationship("User", foreign_keys=[created_by_id], back_populates="created_resources")
    verifier = relationship("User", foreign_keys=[verified_by_id], back_populates="verified_resources")

    observations = relationship("Observation", back_populates="resource")
    photos = relationship("Photo", back_populates="resource")
