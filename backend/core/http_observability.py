from __future__ import annotations

from collections import deque
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict

_HTTP_COUNTERS: defaultdict[str, int] = defaultdict(int)
_HTTP_DURATION_SUM: defaultdict[str, float] = defaultdict(float)
_HTTP_DURATION_COUNT: defaultdict[str, int] = defaultdict(int)
_HTTP_EVENTS: deque["HttpEvent"] = deque(maxlen=12000)


@dataclass(frozen=True)
class HttpEvent:
    at: datetime
    method: str
    path: str
    status: int
    duration_seconds: float
    request_id: str | None = None


def record_http_request(
    method: str,
    path: str,
    status: int,
    duration_seconds: float,
    request_id: str | None = None,
) -> None:
    key = f"{method.upper()}|{path}|{int(status)}"
    _HTTP_COUNTERS[key] += 1
    mp = f"{method.upper()}|{path}"
    _HTTP_DURATION_SUM[mp] += max(0.0, float(duration_seconds))
    _HTTP_DURATION_COUNT[mp] += 1
    _HTTP_EVENTS.append(
        HttpEvent(
            at=datetime.now(timezone.utc),
            method=method.upper(),
            path=path,
            status=int(status),
            duration_seconds=max(0.0, float(duration_seconds)),
            request_id=request_id,
        )
    )


def snapshot_http_counters() -> Dict[str, int]:
    return dict(_HTTP_COUNTERS)


def snapshot_http_duration_sums() -> Dict[str, float]:
    return dict(_HTTP_DURATION_SUM)


def snapshot_http_duration_counts() -> Dict[str, int]:
    return dict(_HTTP_DURATION_COUNT)


def snapshot_http_events_last_24h() -> list[HttpEvent]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    return [e for e in list(_HTTP_EVENTS) if e.at >= cutoff]


def reset_http_counters_for_tests() -> None:
    _HTTP_COUNTERS.clear()
    _HTTP_DURATION_SUM.clear()
    _HTTP_DURATION_COUNT.clear()
    _HTTP_EVENTS.clear()
