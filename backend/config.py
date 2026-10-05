"""Application configuration loaded from environment variables."""

import os
from typing import List


def get_allowed_origins() -> List[str]:
    """Parse ALLOWED_ORIGINS env var into a list of origin strings.

    Defaults to common local development origins if not set.
    """
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5500,http://127.0.0.1:5500")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def get_n8n_webhook_url() -> str:
    """Return the n8n webhook URL from env. Raises if not set."""
    url = os.getenv("N8N_WEBHOOK_URL", "")
    if not url:
        raise RuntimeError("N8N_WEBHOOK_URL environment variable is not set")
    return url


def get_n8n_webhook_secret() -> str:
    """Return the optional n8n webhook secret. Empty string if not set."""
    return os.getenv("N8N_WEBHOOK_SECRET", "")
