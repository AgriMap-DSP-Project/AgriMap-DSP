"""
AgriMap DSP — Pagination Schema
Shared response wrapper for paginated list endpoints.
"""
from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standardized paginated response for all list endpoints."""
    items: List[T]
    total: int
    skip: int
    limit: int
