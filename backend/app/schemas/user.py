"""
Auth schemas for Rakshak user registration and login.
"""
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re


class UserRegister(BaseModel):
    email: str
    organisation_name: str
    password: str
    website: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 256:
            raise ValueError("Password must be 256 characters or fewer")
        return v

    @field_validator("email")
    @classmethod
    def valid_email(cls, v: str) -> str:
        value = v.strip()
        if len(value) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid organisation email address")
        return value

    @field_validator("organisation_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Organisation name cannot be empty")
        return v.strip()


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    organisation_name: str
    website: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
