from __future__ import annotations

from fastapi import APIRouter, Response

from core.http_observability import (
    snapshot_http_counters,
    snapshot_http_duration_counts,
    snapshot_http_duration_sums,
)
from core.job_observability import snapshot_job_counters

router = APIRouter(tags=["metrics"])


@router.get("/metrics", include_in_schema=False)
async def prometheus_metrics() -> Response:
    lines = [
        "# HELP http_requests_total Total HTTP requests",
        "# TYPE http_requests_total counter",
    ]
    for key, val in sorted(snapshot_http_counters().items()):
        method, path, status = key.split("|", 2)
        lines.append(
            f'http_requests_total{{method="{method}",path="{path}",status="{status}"}} {val}'
        )

    lines += [
        "# HELP http_request_duration_seconds_sum Sum of HTTP request durations",
        "# TYPE http_request_duration_seconds_sum counter",
    ]
    for key, val in sorted(snapshot_http_duration_sums().items()):
        method, path = key.split("|", 1)
        lines.append(
            f'http_request_duration_seconds_sum{{method="{method}",path="{path}"}} {val:.6f}'
        )
    lines += [
        "# HELP http_request_duration_seconds_count Count of HTTP request durations",
        "# TYPE http_request_duration_seconds_count counter",
    ]
    for key, val in sorted(snapshot_http_duration_counts().items()):
        method, path = key.split("|", 1)
        lines.append(
            f'http_request_duration_seconds_count{{method="{method}",path="{path}"}} {val}'
        )

    lines += [
        "# HELP job_outcomes_total Terminal outcomes by job type",
        "# TYPE job_outcomes_total counter",
    ]
    for key, val in sorted(snapshot_job_counters().items()):
        job_type, terminal = key.split("|", 1)
        lines.append(f'job_outcomes_total{{job_type="{job_type}",terminal="{terminal}"}} {val}')

    text = "\n".join(lines) + "\n"
    return Response(content=text, media_type="text/plain; version=0.0.4")
