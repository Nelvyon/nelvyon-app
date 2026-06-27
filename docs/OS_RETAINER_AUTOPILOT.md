# OS Retainer Autopilot v2 (O25)

Turns the autopilot toggles into a **verifiable monthly retainer**: what was promised
(expected services) vs what was actually delivered (recurring run log + deliverables),
visible to both the OS operator and the client portal. Delivery proof only — no billing
in v1.

## Monthly cycle (YYYY-MM UTC)

One `os_retainer_cycles` row per `(tenant_id, period_key)`. `period_key` matches O19.

## Toggles → expected services

`expectedServicesFromSettings(autopilotSettings)`:
- `seoEnabled` → `seo`
- `socialEnabled` → `social`
- `reputationEnabled` → `reputation`
- `adsEnabled` → `ads`

## Status

`computeCycleStatus(expected, recurringRuns)`:
- **verified** — every expected service has a `completed` recurring run (sets `verified_at`)
- **partial** — some delivered, not all
- **failed** — none delivered and at least one run failed
- **open** — nothing expected yet, or nothing delivered without failures

## Sync

- **Cron** — `/api/cron/os-recurring-services` calls `syncAllEligibleTenants(month)`
  after generation + run-log recording (best-effort, non-blocking).
- **Manual** — `POST /api/os/retainer/sync { tenantId?, periodKey? }`.

## Portal visibility

`portal_visible` defaults true. The client portal view (`getPortalRetainerView`)
shows the current month's checklist (delivered/pending/failed per service) + last 6
periods of history. Resolved from portal `workspaceId` →
`saas_tenants.workspace_id` → tenant id.

## APIs

OS (`requirePlatformClaims`):
- `GET /api/os/retainer` → `{ summary, cycles[] }`
- `GET /api/os/retainer/[tenantId]` → cycles + current portal view
- `POST /api/os/retainer/sync` → manual resync

Portal (`requirePortalClaims`):
- `GET /api/platform/portal/retainer` → current month view + history

Dashboards: `/os/retainer` (operator), `/portal/retainer` (client).
