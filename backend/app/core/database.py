from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # checks connection health before checks
    pool_size=10,        # connection pool limit
    max_overflow=20      # limit for overflow connections
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency generator for database sessions.
    Ensures sessions are closed after the request is completed.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
