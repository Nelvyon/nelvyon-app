"""HTTP error handling helpers for CRM and OS routers (contacts, deals, workflows, workflow-engine)."""
import logging
from typing import NoReturn

from core.secrets import safe_client_error_detail, sanitize_text
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

INTERNAL_ERROR_DETAIL = "Internal server error"


def raise_internal(logger: logging.Logger, message: str, exc: BaseException) -> NoReturn:
    """Log the exception with traceback and return a generic 500 (no internal string leak)."""
    logger.error("%s: %s", message, sanitize_text(str(exc)))
    raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL) from None


def warn_and_bad_request(logger: logging.Logger, context: str, exc: ValueError) -> NoReturn:
    detail = safe_client_error_detail(exc, fallback="Bad request")
    logger.warning("%s: %s", context, detail)
    raise HTTPException(status_code=400, detail=detail) from None


def warn_integrity_conflict(logger: logging.Logger, context: str, exc: IntegrityError) -> NoReturn:
    logger.warning("%s: %s", context, sanitize_text(str(exc)))
    raise HTTPException(
        status_code=409,
        detail="Conflict with existing data (constraint or duplicate).",
    ) from None


def warn_unprocessable(logger: logging.Logger, context: str, detail: str) -> NoReturn:
    """422 — validation / semantically invalid payload (e.g. invalid JSON in a string field)."""
    logger.warning("%s: %s", context, detail)
    raise HTTPException(status_code=422, detail=detail) from None


def raise_deals_value_error(logger: logging.Logger, exc: ValueError) -> NoReturn:
    """Map DealsService ValueError to 400 or 404 (referenced contact)."""
    msg = str(exc)
    if msg == "Contact not found":
        logger.warning("deals: referenced contact not found")
        raise HTTPException(status_code=404, detail="Contact not found") from None
    if "different workspace" in msg:
        logger.warning("deals: contact not in workspace: %s", msg)
        raise HTTPException(
            status_code=400,
            detail="Contact does not belong to this workspace.",
        ) from None
    logger.warning("deals validation: %s", msg)
    raise HTTPException(status_code=400, detail=msg) from None
