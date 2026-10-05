"""HTTP client for forwarding leads to the n8n webhook."""

import logging
from typing import Any, Dict

import httpx

from .config import get_n8n_webhook_url, get_n8n_webhook_secret

logger = logging.getLogger(__name__)

N8N_TIMEOUT_SECONDS = 10


class N8nError(Exception):
    """Raised when the n8n webhook call fails."""

    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


async def send_to_n8n(payload: Dict[str, Any]) -> None:
    """Forward lead data to the n8n webhook.

    Args:
        payload: Dict with keys first_name, last_name, email, phone, company, message.

    Raises:
        N8nError: On timeout (504), connection failure (502), or non-2xx response (502).
    """
    url = get_n8n_webhook_url()
    secret = get_n8n_webhook_secret()

    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if secret:
        headers["X-Webhook-Secret"] = secret

    try:
        async with httpx.AsyncClient(timeout=N8N_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=payload, headers=headers)

        if response.status_code < 200 or response.status_code >= 300:
            logger.error(
                "n8n webhook returned %d: %s", response.status_code, response.text
            )
            raise N8nError(
                "Unable to process your request right now. Please try again later.",
                status_code=502,
            )

    except httpx.TimeoutException:
        logger.error("n8n webhook timed out after %ds", N8N_TIMEOUT_SECONDS)
        raise N8nError(
            "Unable to process your request right now. Please try again later.",
            status_code=504,
        )
    except httpx.ConnectError as exc:
        logger.error("n8n webhook connection error: %s", exc)
        raise N8nError(
            "Unable to process your request right now. Please try again later.",
            status_code=502,
        )
    except N8nError:
        raise
    except Exception as exc:
        logger.error("Unexpected error calling n8n webhook: %s", exc)
        raise N8nError(
            "Unable to process your request right now. Please try again later.",
            status_code=502,
        )
