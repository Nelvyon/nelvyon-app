# HA / DR world-scale runbook

Budget-conscious high-availability / disaster-recovery plan. Source of truth
for the structured checklist: `backend/agency/HaDrReadiness.ts` (tested —
`backend/agency/__tests__/HaDrReadiness.test.ts`). No paid multi-region infra,
no paid WAF/CDN commitment — everything below either already exists or is a
documented next step gated on CEO budget approval.

## Estado honesto (resumen)

| Ámbito | Estado |
|---|---|
| **Single-region resiliente** | **IMPLEMENTED_VERIFIED** — RPO/RTO definidos, health checks reales, capacity smoke, degradación gestionada (`bffDegraded`), rate-limit presence check, stateless assertion (con caveats honestos), rollback checklist, kill switches. |
| **Multi-region** | **BLOCKED_EXTERNAL / COST** — requiere presupuesto CEO explícito. `isMultiRegionEnabled()` hardcodeado `false`, sin plumbing de env var que lo cambie. |

Opcional, no bloqueante de CI: `node scripts/staging-smoke-ha-dr-readiness.mjs`
(corre el suite vitest + una capacity smoke real no-fatal contra staging,
escribe evidencia en `scripts/docs/evidence/os-saas-e2e/modules/`).

---

## RPO / RTO targets

| Métrica | Objetivo | Cómo se logra hoy |
|---|---|---|
| **RPO** (Recovery Point Objective) | ≤ 24h | Backup diario de Railway Postgres (`.github/workflows/db-backup.yml`). |
| **RTO** (Recovery Time Objective) | ≤ 4h | Restore manual a un target no-prod + redeploy Railway; ver drill abajo. |

These are documentation targets, not SLA promises to third parties — they
describe the operational capability that exists today with free-tier/current
Railway infra.

## Backups / restore

- Backup workflow: `.github/workflows/db-backup.yml` (requires `DATABASE_PUBLIC_URL`, not `railway.internal`).
- Restore drill script: `scripts/run-postgres-restore-drill.mjs`.
- Full procedure + evidence path: `docs/ops/POSTGRES_RESTORE_DRILL.md` (this
  runbook does not duplicate it — link only).
- **Never** run the drill against production; always a non-prod restore target.

## Health checks

Already shipped, zero new infra:

| Endpoint | Purpose |
|---|---|
| `/api/health` | liveness lightweight |
| `/api/health/live` | k8s/Railway live probe |
| `/api/health/ready` | readiness (dependencies) |
| `/api/health/deep` | deep dependency check |

Staging health URL pattern (see `backend/agency/HaDrReadiness.ts`):

```
https://{staging-subdomain}.up.railway.app/api/health/deep
```

## Rate limits

- Campaign/email send rate limit is a **required, code-enforced** field:
  `CampaignsLegalTechnicalGate.sendRateLimitPerHourMax` must be a positive,
  sane number or the technical readiness check fails closed.
- General API throttling (per-tenant, per-IP) is an ops practice layered on
  Railway + Next.js middleware today — no paid WAF/rate-limit SaaS is in use
  or required at current traffic.

## Queues

- `backend/queue/*` + workflow idempotency (4-minute window, see CLAUDE.md)
  absorb bursts and retries without a paid message broker (no SQS/RabbitMQ
  cost added).
- Offline/async mobile actions use the same idea at a smaller scale — see
  `backend/agency/MobileSecureSession.ts` (`MobileOfflineQueue`).

## Optional cache / CDN (not enabled)

- Today: Railway edge + Next.js built-in static asset caching.
- If/when real traffic justifies it: a CDN (e.g. Cloudflare free tier first,
  paid tier only with CEO approval) sitting in front of `app.nelvyon.com`.
  **Not configured today** — no DNS/CDN change made by this runbook.

## Capacity smoke (single-region)

`runCapacitySmoke()` in `backend/agency/HaDrReadiness.ts` fires a small burst
(default 5 concurrent requests) at each of the 4 real `/api/health*` probes
and fails closed on a non-200 status, a thrown network error, or latency over
the configured budget (default 3000ms). This is a lightweight smoke, **not**
a load-testing product — it verifies the app answers correctly under a small
concurrent burst on the current free/starter-tier Railway plan. Run it for
real (non-fatal, staging only) with `node scripts/staging-smoke-ha-dr-readiness.mjs`.

## Graceful degradation (implemented today)

`apps/web/src/lib/bffDegraded.ts` already marks BFF responses
`{ degraded: true, degraded_reason: "upstream_unavailable" | "oauth_not_configured" | "no_live_data" }`
instead of hard-failing when an upstream integration/OAuth is unavailable —
consumed today by the ads/ecommerce/social/funnels/automations/reputación BFF
routes. `HaDrReadiness.ts` validates this contract
(`isGracefulDegradationReasonCode`, `isWellFormedDegradedResponse`) without
duplicating the BFF implementation.

## Stateless assertion — honest, with caveats

The app is stateless-safe for the current single Railway instance: JWT
cookie auth (no server session store), Postgres-backed business data and
workflow idempotency window. **Known in-memory caveats** that currently
assume a single instance (documented in `HA_DR_STATELESS_ASSERTION`, never
silently upgraded to "fully stateless"):

- `MassSendTechnicalControls` suppression list + send-rate-limit window (in-memory `Map`).
- `OpsObservabilityCore` metrics counters + alert log (in-memory per instance).
- `PrivateVectorRagCore` / `StagingSharedMemoryMcpHarness` synthetic stores (staging-only, in-memory by design).

If/when horizontal scaling (N Railway replicas) is ever needed, these three
need a shared store (Redis/Postgres) first — tracked here, not yet required
at current traffic.

## Kill switches

Every risky subsystem in this codebase is already gated by an environment
flag that can be flipped to `0`/unset without a deploy rollback. Canonical
list lives in `docs/HANDOVER.md` ("Rollback staging") — this runbook does not
duplicate the live list to avoid drift; it documents the *pattern*:

1. Every new risky capability (OS orchestration, MCP, shared memory, visual
   generation, campaign sends, partner payouts, automations/reputation ops
   packs) ships **default OFF**.
2. Enabling it requires an explicit env var, scoped to staging first.
3. Disabling is always "unset the var / set to 0" — no code rollback needed.

## Rollback checklist

`HA_DR_ROLLBACK_CHECKLIST` in `backend/agency/HaDrReadiness.ts` (6 steps):
identify last known-good Railway deploy → redeploy/`railway rollback` →
verify `/api/health/deep` 200 before declaring resolved → prefer flipping a
feature flag over a full redeploy when the incident is flag-caused → never
auto-rollback a DB migration (follow `docs/ops/POSTGRES_RESTORE_DRILL.md`
instead) → log the incident in `docs/KNOWN_ISSUES.md`/`docs/DECISIONS.md`.

## Multi-region — BLOCKED_EXTERNAL / COST

Multi-region deployment (active-active or active-passive across Railway
regions/providers) is **not implemented and not planned** without an
explicit CEO-approved infra budget. `backend/agency/HaDrReadiness.ts` hardcodes
`isMultiRegionEnabled() === false` and this must never be flipped by an env
var — only by a follow-up code change once/if budget is approved.

## Not done by this runbook

- No production destructive restore.
- No paid CDN/WAF/multi-region vendor contracted or configured.
- No change to existing rate limits, queues, or kill-switch flags — this
  document audits and links what already exists.
