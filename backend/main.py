"""FastAPI application — routes, exception handlers, CORS, rate limiting."""

import logging
import os
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .config import get_allowed_origins
from .n8n_client import N8nError, send_to_n8n
from .schemas import LeadRequest, LeadResponse

# ── Load env & logging ───────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── Rate limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="Lead Capture API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Exception handlers ──────────────────────────────────────────────────────


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return a consistent error envelope for Pydantic validation failures."""
    errors = exc.errors()
    if errors:
        first = errors[0]
        # Pydantic v2 wraps custom ValueError messages in a ctx dict
        msg = first.get("ctx", {}).get("error", first.get("msg", "Validation error"))
        message = str(msg)
    else:
        message = "Validation error"
    logger.warning("Validation failed: %s", message)
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": message},
    )


# ── Routes ───────────────────────────────────────────────────────────────────


@app.get("/health")
async def health_check() -> dict:
    """Simple health-check endpoint."""
    return {"status": "ok"}


@app.post("/api/leads", response_model=LeadResponse)
@limiter.limit("10/minute")
async def create_lead(lead: LeadRequest, request: Request) -> JSONResponse:
    """Accept a lead submission, validate it, and forward to n8n.

    Returns:
        JSON with {success: true/false, message: ...}
    """
    lead_id = str(uuid4())

    payload = {
        "lead_id": lead_id,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "email": lead.email,
        "phone": lead.phone,
        "company": lead.company,
        "message": lead.message,
    }

    logger.info("Lead %s received: %s %s <%s>", lead_id, lead.first_name, lead.last_name, lead.email)

    try:
        await send_to_n8n(payload)
    except N8nError as exc:
        logger.error("n8n forwarding failed: %s", exc)
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "message": str(exc), "lead_id": lead_id},
        )

    return JSONResponse(
        status_code=200,
        content={"success": True, "message": "Lead submitted successfully", "lead_id": lead_id},
    )
