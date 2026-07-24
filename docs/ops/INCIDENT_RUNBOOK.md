# Incident runbook (short)

Free/local observability only — no paid Datadog/New Relic. Structured
helpers: `backend/agency/OpsObservabilityCore.ts` (correlation ids, in-memory
metrics, health snapshot, alert simulation). Tested:
`backend/agency/__tests__/OpsObservabilityCore.test.ts`.

## Severity levels

| Severity | Meaning | Example |
|---|---|---|
| P0 | Full outage / data risk | DB unreachable, auth broken for all tenants |
| P1 | Major degradation | One core module down (e.g. campaigns send fully blocked) |
| P2 | Partial degradation | Slow responses on one route, non-blocking |
| P3 | Cosmetic / low impact | UI glitch, non-critical log noise |

## First 5 minutes (any severity)

1. Check `/api/health/deep` on the affected environment (staging or prod URL
   from `docs/ENVIRONMENTS.md`).
2. Grab/assign a correlation id for the incident:
   `generateCorrelationId("incident")` — attach it to every log line, PR, and
   status update so the timeline is traceable end-to-end.
3. Check Railway deploy logs for the affected service around the incident
   start time.
4. If a recent deploy/flag change correlates, prefer **flag rollback** (see
   `docs/HANDOVER.md` "Rollback staging" list and
   `docs/ops/HA_DR_SCALE_RUNBOOK.md` "Kill switches") over a code revert —
   it's faster and lower-risk.

## P0/P1 escalation

1. Open/record an incident note (correlation id + timestamp + affected
   surface) — no dedicated paid incident tool required; a dated entry in
   `docs/KNOWN_ISSUES.md` is sufficient at current scale.
2. Notify CEO/ops per the existing escalation channel (no new tool
   introduced by this runbook).
3. If data integrity is at risk: **do not** run destructive commands; follow
   `docs/ops/POSTGRES_RESTORE_DRILL.md` against a non-prod target first.

## Resolution

1. Confirm `/api/health/deep` is green post-fix.
2. Record root cause + fix in `docs/CHANGELOG.md` and, if it changes a
   documented gap, `docs/KNOWN_ISSUES.md`.
3. If the incident revealed a missing kill switch or health probe, add it —
   file a follow-up rather than leaving a silent gap.

## What this runbook intentionally does NOT include

- No paid APM/alerting vendor (Datadog, New Relic, PagerDuty, etc.).
- No automatic paging — alert "simulation" in `OpsObservabilityCore.ts` is a
  local, in-memory, testable stand-in for future real alerting, not a live
  paging system today.
