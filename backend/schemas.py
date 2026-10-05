"""Pydantic models for request/response validation."""

from typing import Optional

from pydantic import BaseModel, field_validator

from .validators import (
    validate_company,
    validate_email,
    validate_first_name,
    validate_last_name,
    validate_message,
    validate_phone,
    sanitize_string,
)


class LeadRequest(BaseModel):
    """Incoming lead capture form data."""

    first_name: str
    last_name: str
    email: str
    phone: str
    company: str
    message: Optional[str] = ""

    @field_validator("first_name", mode="before")
    @classmethod
    def check_first_name(cls, v: str) -> str:
        v = sanitize_string(v, max_length=100)
        error = validate_first_name(v)
        if error:
            raise ValueError(error)
        return v

    @field_validator("last_name", mode="before")
    @classmethod
    def check_last_name(cls, v: str) -> str:
        v = sanitize_string(v, max_length=100)
        error = validate_last_name(v)
        if error:
            raise ValueError(error)
        return v

    @field_validator("email", mode="before")
    @classmethod
    def check_email(cls, v: str) -> str:
        v = sanitize_string(v, max_length=254)
        error = validate_email(v)
        if error:
            raise ValueError(error)
        return v.lower()

    @field_validator("phone", mode="before")
    @classmethod
    def check_phone(cls, v: str) -> str:
        v = sanitize_string(v, max_length=30)
        error = validate_phone(v)
        if error:
            raise ValueError(error)
        return v

    @field_validator("company", mode="before")
    @classmethod
    def check_company(cls, v: str) -> str:
        v = sanitize_string(v, max_length=200)
        error = validate_company(v)
        if error:
            raise ValueError(error)
        return v

    @field_validator("message", mode="before")
    @classmethod
    def check_message(cls, v: Optional[str]) -> str:
        if v is None:
            return ""
        v = sanitize_string(v, max_length=1000)
        error = validate_message(v)
        if error:
            raise ValueError(error)
        return v


class LeadResponse(BaseModel):
    """Standard API response envelope."""

    success: bool
    message: str
    lead_id: Optional[str] = None
