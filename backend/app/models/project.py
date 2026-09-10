import uuid
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import String, Text, Date, DateTime, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.models.base import Base


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "status IN ('planning', 'active', 'completed', 'archived')",
            name="chk_project_status"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="planning",
        nullable=False
    )
    start_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True
    )
    end_date: Mapped[Optional[date]] = mapped_column(
        Date,
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
    fields = relationship("Field", back_populates="project")
    resources = relationship("Resource", back_populates="project")
    reference_points = relationship("ReferencePoint", back_populates="project")
    observations = relationship("Observation", back_populates="project")
