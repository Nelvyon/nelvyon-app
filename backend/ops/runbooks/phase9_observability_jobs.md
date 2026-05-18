# Phase 9 Jobs + Observability Runbook

## Incident: Elevated API 5xx
- Check `/metrics` for `http_requests_total{status=~"5.."}` growth.
- Identify top failing paths and correlate with app logs by `X-Request-ID`.
- If a recent deploy exists, roll back and monitor 10 minutes.

## Incident: High Job Failure Ratio
- Check `job_outcomes_total{terminal="failed"}` by `job_type`.
- Inspect latest failed job payloads and error previews in structured logs.
- Pause noisy producer path if one job type dominates.

## Incident: Contract Validation Failures
- Review producer code enqueuing `email|report|webhook|cleanup`.
- Ensure payload fields satisfy `core/job_contracts.py`.
- Add/adjust producer tests before re-enabling traffic.
