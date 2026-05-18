from __future__ import annotations

from typing import Any, Dict, Mapping

CONTRACT_JOB_TYPES = frozenset({"email", "report", "webhook", "cleanup"})

CLEANUP_TARGETS_IMPLEMENTED = frozenset({"saas_job_audits"})


def _require_non_empty_str(payload: Mapping[str, Any], key: str) -> None:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key} is required and must be a non-empty string")


def _require_positive_workspace_id(payload: Mapping[str, Any]) -> None:
    raw = payload.get("workspace_id")
    if raw is None:
        raise ValueError("job requires workspace_id")
    try:
        ws = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError("workspace_id must be an integer") from exc
    if ws <= 0:
        raise ValueError("workspace_id must be positive")


def _require_actor_user_id(payload: Mapping[str, Any]) -> None:
    _require_non_empty_str(payload, "actor_user_id")


def _validate_email(payload: Mapping[str, Any]) -> None:
    _require_positive_workspace_id(payload)
    _require_actor_user_id(payload)
    _require_non_empty_str(payload, "to")
    _require_non_empty_str(payload, "subject")
    if not payload.get("body") and not payload.get("template_id"):
        raise ValueError("email job requires body or template_id")


def _validate_report(payload: Mapping[str, Any]) -> None:
    _require_positive_workspace_id(payload)
    _require_actor_user_id(payload)
    _require_non_empty_str(payload, "report_type")


def _validate_webhook(payload: Mapping[str, Any]) -> None:
    _require_positive_workspace_id(payload)
    _require_actor_user_id(payload)
    _require_non_empty_str(payload, "url")
    _require_non_empty_str(payload, "method")
    if payload.get("payload") is None:
        raise ValueError("webhook job requires payload")


def _validate_cleanup(payload: Mapping[str, Any]) -> None:
    _require_non_empty_str(payload, "target")
    days = payload.get("older_than_days")
    if not isinstance(days, int) or days <= 0:
        raise ValueError("cleanup job requires older_than_days as positive integer")
    _require_positive_workspace_id(payload)
    _require_actor_user_id(payload)
    if str(payload.get("target") or "").strip() not in CLEANUP_TARGETS_IMPLEMENTED:
        raise ValueError(
            f"cleanup target must be one of: {', '.join(sorted(CLEANUP_TARGETS_IMPLEMENTED))}"
        )


def validate_job_payload(job_type: str, payload: Dict[str, Any]) -> None:
    """Validate payload for contracted job types only."""
    if job_type not in CONTRACT_JOB_TYPES:
        return
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")
    if job_type == "email":
        _validate_email(payload)
    elif job_type == "report":
        _validate_report(payload)
    elif job_type == "webhook":
        _validate_webhook(payload)
    elif job_type == "cleanup":
        _validate_cleanup(payload)
