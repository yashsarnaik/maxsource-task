"""Server-side validation functions, independent of the frontend.

Each validate_* function returns an error string if invalid, or an empty string
if valid. This mirrors the frontend pattern but is fully independent.
"""

import re


# ── Helpers ──────────────────────────────────────────────────────────────────

_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
_PHONE_ALLOWED_RE = re.compile(r"^[0-9\s\-\(\)\+]+$")


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Trim whitespace, strip control characters, and cap length."""
    if not isinstance(value, str):
        return ""
    value = _CONTROL_CHAR_RE.sub("", value)
    value = value.strip()
    return value[:max_length]


def _count_digits(value: str) -> int:
    """Count the number of digit characters in a string."""
    return sum(1 for ch in value if ch.isdigit())


# ── Validators ───────────────────────────────────────────────────────────────

def validate_first_name(value: str) -> str:
    """Validate first name: required, non-blank after trim."""
    if not value or not value.strip():
        return "First name is required."
    return ""


def validate_last_name(value: str) -> str:
    """Validate last name: required, non-blank after trim."""
    if not value or not value.strip():
        return "Last name is required."
    return ""


def validate_email(value: str) -> str:
    """Validate email: required, must match a standard email pattern."""
    if not value or not value.strip():
        return "Email is required."
    if not _EMAIL_RE.match(value.strip()):
        return "Please enter a valid email address."
    return ""


def validate_phone(value: str) -> str:
    """Validate phone: required, allows digits/spaces/dashes/parens/leading +,
    must contain 10-15 digits after stripping formatting."""
    if not value or not value.strip():
        return "Phone number is required."
    cleaned = value.strip()
    if not _PHONE_ALLOWED_RE.match(cleaned):
        return "Phone number contains invalid characters."
    digit_count = _count_digits(cleaned)
    if digit_count < 10 or digit_count > 15:
        return "Phone number must contain 10 to 15 digits."
    return ""


def validate_company(value: str) -> str:
    """Validate company: required, non-blank after trim."""
    if not value or not value.strip():
        return "Company is required."
    return ""


def validate_message(value: str) -> str:
    """Validate message: optional, max 1000 characters."""
    if value and len(value) > 1000:
        return "Message must be 1000 characters or fewer."
    return ""
