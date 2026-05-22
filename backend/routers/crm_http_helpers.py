"""HTTP error handling helpers for CRM and OS routers (contacts, deals, workflows, workflow-engine)."""
import logging
from typing import NoReturn, Optional

from core.i18n import request_language, t
from core.secrets import safe_client_error_detail, sanitize_text
from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError


def raise_internal(
    logger: logging.Logger,
    message: str,
    exc: BaseException,
    request: Optional[Request] = None,
) -> NoReturn:
    """Log the exception with traceback and return a generic 500 (no internal string leak)."""
    logger.error("%s: %s", message, sanitize_text(str(exc)))
    lang = request_language(request)
    raise HTTPException(
        status_code=500,
        detail=t("internal_server_error", lang),
    ) from None


def warn_and_bad_request(
    logger: logging.Logger,
    context: str,
    exc: ValueError,
    request: Optional[Request] = None,
) -> NoReturn:
    lang = request_language(request)
    detail = safe_client_error_detail(exc, fallback=t("bad_request", lang))
    logger.warning("%s: %s", context, detail)
    raise HTTPException(status_code=400, detail=detail) from None


def warn_integrity_conflict(
    logger: logging.Logger,
    context: str,
    exc: IntegrityError,
    request: Optional[Request] = None,
) -> NoReturn:
    logger.warning("%s: %s", context, sanitize_text(str(exc)))
    lang = request_language(request)
    raise HTTPException(
        status_code=409,
        detail=t("conflict_duplicate", lang),
    ) from None


def warn_unprocessable(
    logger: logging.Logger,
    context: str,
    detail: str,
    request: Optional[Request] = None,
) -> NoReturn:
    """422 — validation / semantically invalid payload (e.g. invalid JSON in a string field)."""
    logger.warning("%s: %s", context, detail)
    lang = request_language(request)
    raise HTTPException(
        status_code=422,
        detail=detail or t("unprocessable_entity", lang),
    ) from None


def raise_deals_value_error(
    logger: logging.Logger,
    exc: ValueError,
    request: Optional[Request] = None,
) -> NoReturn:
    """Map DealsService ValueError to 400 or 404 (referenced contact)."""
    lang = request_language(request)
    msg = str(exc)
    if msg == "Contact not found":
        logger.warning("deals: referenced contact not found")
        raise HTTPException(
            status_code=404,
            detail=t("contact_not_found", lang),
        ) from None
    if "different workspace" in msg:
        logger.warning("deals: contact not in workspace: %s", msg)
        raise HTTPException(
            status_code=400,
            detail=t("contact_wrong_workspace", lang),
        ) from None
    logger.warning("deals validation: %s", msg)
    raise HTTPException(status_code=400, detail=msg) from None
