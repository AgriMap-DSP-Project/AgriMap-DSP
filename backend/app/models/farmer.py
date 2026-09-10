import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.models.base import Base


class Farmer(Base):
    __tablename__ = "farmers"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    contact_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    address: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
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
    fields = relationship("Field", back_populates="farmer")
