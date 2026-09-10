"""
AgriMap DSP — Authentication Schemas
"""
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Request body for user login."""
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """Response returned after successful authentication."""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str
