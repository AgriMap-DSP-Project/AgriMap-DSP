import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.models.base import Base


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    file_path: Mapped[str] = mapped_column(
        String(512),
        nullable=False
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    file_size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    # PostGIS Point column (SRID 4326) extracted from EXIF GPS tags
    geom = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True),
        nullable=True
    )
    direction_degrees: Mapped[Optional[float]] = mapped_column(
        Numeric(5, 2),
        nullable=True
    )
    captured_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    
    # Nullable FK associations
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
    observation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("observations.id", ondelete="SET NULL"),
        nullable=True,
        index=True
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
    field = relationship("Field", back_populates="photos")
    zone = relationship("FieldZone", back_populates="photos")
    resource = relationship("Resource", back_populates="photos")
    observation = relationship("Observation", back_populates="photos")
    
    uploader = relationship("User", foreign_keys=[created_by_id], back_populates="uploaded_photos")
