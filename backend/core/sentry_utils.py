"""Sentry helpers — safe no-op when SDK is not initialized."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def capture_exception(exc: BaseException, **extra: Any) -> None:
    """Report a critical exception to Sentry if configured."""
    try:
        import sentry_sdk

        if extra:
            with sentry_sdk.push_scope() as scope:
                for key, value in extra.items():
                    scope.set_extra(key, value)
                sentry_sdk.capture_exception(exc)
        else:
            sentry_sdk.capture_exception(exc)
    except Exception as report_err:
        logger.debug("Sentry capture skipped: %s", report_err)
