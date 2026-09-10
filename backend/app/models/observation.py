import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.models.base import Base


class Observation(Base):
    __tablename__ = "observations"
    __table_args__ = (
        CheckConstraint(
            "category IN ('soil_health', 'crop_growth', 'pest_weed_infestation', 'damage', 'general')",
            name="chk_observation_category"
        ),
        CheckConstraint(
            "verification_status IN ('pending', 'verified', 'rejected')",
            name="chk_observation_verification_status"
        ),
        CheckConstraint(
            "(verification_status = 'pending' AND verified_by_id IS NULL AND verified_at IS NULL) OR "
            "(verification_status IN ('verified', 'rejected') AND verified_by_id IS NOT NULL AND verified_at IS NOT NULL)",
            name="chk_observation_verification_data"
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
    zone_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("field_zones.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("resources.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    notes: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    # GeoAlchemy2 Point column in WGS 84 (SRID 4326) - optional location
    geom = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
        nullable=True
    )
    observed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
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
    project = relationship("Project", back_populates="observations")
    field = relationship("Field", back_populates="observations")
    zone = relationship("FieldZone", back_populates="observations")
    resource = relationship("Resource", back_populates="observations")
    
    creator = relationship("User", foreign_keys=[created_by_id], back_populates="created_observations")
    verifier = relationship("User", foreign_keys=[verified_by_id], back_populates="verified_observations")

    photos = relationship("Photo", back_populates="observation")
