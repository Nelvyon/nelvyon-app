# OPS — Operación enterprise NELVYON

> Actualizado: **2026-07-29**. Sin secretos.  
> **Índice ops:** [`ops/OPERATIONS_INDEX.md`](./ops/OPERATIONS_INDEX.md) · Runbook unificado: [`ops/WORLD_CLASS_OPS_RUNBOOK.md`](./ops/WORLD_CLASS_OPS_RUNBOOK.md)  
> Launch: [`LAUNCH_CHECKLIST_DEFINITIVE.md`](./LAUNCH_CHECKLIST_DEFINITIVE.md) · Security ops: [`ops/SECURITY_OPERATIONS.md`](./ops/SECURITY_OPERATIONS.md)

---

## Health checks

| Ruta | Uso | Auth |
|------|-----|------|
| `GET /api/health` | Liveness ligero | Público |
| `GET /api/health/live` | Liveness + git SHA (Railway) | Público |
| `GET /api/health/ready` | Readiness DB + JWT + env crítico | Público |
| `GET /api/health/deep` | SRE: DB, Redis, Stripe, SES, OpenAI | `CRON_SECRET` |
| `GET /api/platform/ops/summary` | Dashboard técnico: deep health + crons + env | Platform admin o `CRON_SECRET` |
| `GET /api/os/health` | OS motor liveness | Público |
| `GET /api/saas/private-ai/router-health` | Router Private AI (gated canary) | SaaS JWT + flags |
| Python `GET /health`, `/health/ready`, `/api/monitoring/health` | API FastAPI | Público / workspace |
| Python `GET /metrics` | Prometheus text | Red interna / política ops |

---

## Endpoints críticos (operación)

| Superficie | Rutas representativas | Notas |
|------------|----------------------|-------|
| Auth / sesión | `/api/auth/*`, cookie `nelvyon_token` | P0 si cae |
| CRM | `/api/saas/crm/*` | Multi-tenant + RBAC |
| Campañas | `/api/saas/campanias/*`, `.../launch` | Rate-limited · SES |
| Workflows | `/api/saas/workflows/*`, `.../webhook-in` | Idempotency key |
| Billing | `/api/saas/billing`, `/api/webhooks/stripe` | Firma Stripe |
| Crons | `/api/cron/*` | `CRON_SECRET` |
| GDPR / export | `/api/saas/compliance/gdpr`, CRM export | Permisos elevados + rate limit |

---

## Logs

| Capa | Formato | Destino |
|------|---------|---------|
| Next.js middleware | `request_start` + `requestId` | stdout Railway |
| Next.js | JSON estructurado (prod) | stdout Railway |
| TS servicios | `backend/logger/logger.ts` | stdout + Sentry en errores |
| Python FastAPI | JSON (`LOG_FORMAT=json`) | stdout + `logs/app.log` rotativo (10MB × 5) |

Variables: `LOG_LEVEL`, `LOG_FORMAT`, `LOG_ROTATE_MAX_BYTES`, `LOG_ROTATE_BACKUP_COUNT`.

### Trazabilidad (`requestId`)

1. Cliente o edge envía / recibe `x-request-id` (`apps/web/src/middleware.ts` → `resolveRequestId` / `withRequestId`).
2. Errores SaaS pueden incluir `requestId` en JSON (`saasErrorBody` + `requestIdFrom`).
3. Buscar el mismo id en logs Railway / Sentry para correlacionar P0/P1.
4. FastAPI: middleware `X-Request-ID` (ver `NELVYON_OBSERVABILITY_REALITY.md`).

**No hay OTEL distribuido desplegado** — correlación = request id + logs. Mejora futura = coste/ops.

---

## Errores (contrato SaaS)

| Código / clase | HTTP | Significado ops |
|----------------|------|----------------|
| `FORBIDDEN` / RBAC | 401/403 | Permiso o auth |
| `PLAN_LIMIT` | 403 | Cuota plan |
| `SECURITY_UNAVAILABLE` | 503 | Control plane ACL/IP falló (fail-closed) |
| `SCHEMA_MISMATCH` | 503 | Mig pendiente — no filtrar SQL al cliente |
| `PRIVATE_AI_CANARY_BLOCKED` | 403 | Canary/kill — esperado en steady KILL |
| `Internal error` | 500 | Ver logs servidor (no leak driver) |

---

## Métricas y alertas (realidad honesta)

| Capacidad | Estado |
|-----------|--------|
| Prometheus `/metrics` (Python) | Código + tests en repo |
| Reglas PromQL | `backend/ops/alerts/phase9_alerts.yaml` — **scrape/Alertmanager = ops externo** |
| Sentry | Si `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` configurados |
| PostHog | Producto (EU) — no paging |
| Status `/status` | Cron `status-check` |
| OpsObservabilityCore | Correlación + métricas **in-memory** + simulación alerta (no PagerDuty) |
| Rate-limit counters | Middleware; Upstash si vars presentes |

Detalle: [`NELVYON_OBSERVABILITY_REALITY.md`](./NELVYON_OBSERVABILITY_REALITY.md).

---

## Cron jobs

Orquestados por **GitHub Actions** `production-cron.yml` → `PRODUCTION_BASE_URL` (fallback `STAGING_BASE_URL`).

Registro canónico: `backend/monitoring/opsRegistry.ts` (16 jobs).

Auth: `x-cron-secret` o `Authorization: Bearer CRON_SECRET`.

---

## Backups

| Mecanismo | Frecuencia | Ubicación |
|-----------|------------|-----------|
| GH Action `db-backup.yml` | Domingos 02:00 UTC | Artifact 30 días |
| CLI manual | On-demand | `backend/scripts/db_backup_restore.py` |
| Restore drill | On-demand **no-prod** | `docs/ops/POSTGRES_RESTORE_DRILL.md` |

Verificación CI: `test_backup_phase1.py` (SQLite round-trip).

CEO: secret `DATABASE_PUBLIC_URL` en GitHub para backups prod (no `railway.internal`).

---

## Validación env producción

`backend/config/prodEnvValidation.ts` — críticos: `JWT_SECRET`, `DATABASE_URL`, `CRON_SECRET`.

Ejecuta al arranque vía `apps/web/src/instrumentation.ts` y en `/api/health/ready`.

---

## Webhooks inbound

Stripe, Stripe Connect, SES/SNS, WhatsApp, Paddle — ver `opsRegistry.ts`.

Webhook-in workflows: idempotency process-local (`webhookInIdempotency.ts`) — caveat multi-réplica documentado en security ops.

CEO: confirmar SNS SES si KI abierto.

---

## Seguridad CI

| Workflow | Frecuencia | Qué valida |
|----------|------------|------------|
| `security-gates.yml` | push main, PR deps, lunes 06:00 UTC | `pnpm audit --audit-level critical`, Gitleaks, migraciones |
| `dependabot.yml` | Semanal | npm + github-actions |
| `web-quality-gates.yml` | push/PR | typecheck, lint, tests, anti-mock |
| `staging-elite-gate.yml` | push main | smokes staging + deploy wait |

Overrides de dependencias: `pnpm-workspace.yaml` (`ws`, `axios`, `vitest`).

RBAC / fail-closed / rate limits: [`ops/SECURITY_OPERATIONS.md`](./ops/SECURITY_OPERATIONS.md).
