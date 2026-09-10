import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.models.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'surveyor', 'verifier', 'farmer')",
            name="chk_user_role"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    farmer_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("farmers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
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
    farmer_profile = relationship("Farmer", foreign_keys="[User.farmer_id]")
    created_fields = relationship("Field", foreign_keys="[Field.created_by_id]", back_populates="creator")
    verified_fields = relationship("Field", foreign_keys="[Field.verified_by_id]", back_populates="verifier")

    created_zones = relationship("FieldZone", foreign_keys="[FieldZone.created_by_id]", back_populates="creator")
    verified_zones = relationship("FieldZone", foreign_keys="[FieldZone.verified_by_id]", back_populates="verifier")

    created_resources = relationship("Resource", foreign_keys="[Resource.created_by_id]", back_populates="creator")
    verified_resources = relationship("Resource", foreign_keys="[Resource.verified_by_id]", back_populates="verifier")

    created_reference_points = relationship("ReferencePoint", foreign_keys="[ReferencePoint.created_by_id]", back_populates="creator")
    verified_reference_points = relationship("ReferencePoint", foreign_keys="[ReferencePoint.verified_by_id]", back_populates="verifier")

    created_observations = relationship("Observation", foreign_keys="[Observation.created_by_id]", back_populates="creator")
    verified_observations = relationship("Observation", foreign_keys="[Observation.verified_by_id]", back_populates="verifier")

    uploaded_photos = relationship("Photo", foreign_keys="[Photo.created_by_id]", back_populates="uploader")
