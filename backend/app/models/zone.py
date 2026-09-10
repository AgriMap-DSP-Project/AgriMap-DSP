import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.models.base import Base


class FieldZone(Base):
    __tablename__ = "field_zones"
    __table_args__ = (
        CheckConstraint(
            "verification_status IN ('pending', 'verified', 'rejected')",
            name="chk_zone_verification_status"
        ),
        CheckConstraint(
            "(verification_status = 'pending' AND verified_by_id IS NULL AND verified_at IS NULL) OR "
            "(verification_status IN ('verified', 'rejected') AND verified_by_id IS NOT NULL AND verified_at IS NOT NULL)",
            name="chk_zone_verification_data"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    field_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    # GeoAlchemy2 Polygon column in WGS 84 (SRID 4326)
    boundary = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True),
        nullable=False
    )
    zone_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
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
    field = relationship("Field", back_populates="zones")
    
    creator = relationship("User", foreign_keys=[created_by_id], back_populates="created_zones")
    verifier = relationship("User", foreign_keys=[verified_by_id], back_populates="verified_zones")

    observations = relationship("Observation", back_populates="zone")
    photos = relationship("Photo", back_populates="zone")
