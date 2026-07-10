# OPS — Operación enterprise NELVYON

> Actualizado: **2026-07-10**. Sin secretos.

---

## Health checks

| Ruta | Uso | Auth |
|------|-----|------|
| `GET /api/health/live` | Liveness + git SHA (Railway) | Público |
| `GET /api/health/ready` | Readiness DB + JWT + env crítico | Público |
| `GET /api/health/deep` | SRE: DB, Redis, Stripe, SES, OpenAI | `CRON_SECRET` |
| `GET /api/platform/ops/summary` | Dashboard técnico: deep health + crons + env | Platform admin o `CRON_SECRET` |
| `GET /api/os/health` | OS motor liveness | Público |
| Python `GET /health`, `/health/ready`, `/api/monitoring/health` | API FastAPI | Público / workspace |

---

## Logs

| Capa | Formato | Destino |
|------|---------|---------|
| Next.js | JSON estructurado (prod) | stdout Railway |
| TS servicios | `backend/logger/logger.ts` | stdout + Sentry en errores |
| Python FastAPI | JSON (`LOG_FORMAT=json`) | stdout + `logs/app.log` rotativo (10MB × 5) |

Variables: `LOG_LEVEL`, `LOG_FORMAT`, `LOG_ROTATE_MAX_BYTES`, `LOG_ROTATE_BACKUP_COUNT`.

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

Verificación CI: `test_backup_phase1.py` (SQLite round-trip).

CEO: configurar secret `DATABASE_URL` en GitHub para backups prod.

---

## Observabilidad

- **Sentry**: `NEXT_PUBLIC_SENTRY_DSN` (Web), `SENTRY_DSN` (Python)
- **PostHog**: analytics producto (EU)
- **Prometheus**: Python `/metrics` — reglas en `backend/ops/alerts/phase9_alerts.yaml` (despliegue externo pendiente)
- **Status page**: `/status` ← cron `status-check` cada 10 min

---

## Validación env producción

`backend/config/prodEnvValidation.ts` — críticos: `JWT_SECRET`, `DATABASE_URL`, `CRON_SECRET`.

Ejecuta al arranque vía `apps/web/src/instrumentation.ts` y en `/api/health/ready`.

---

## Webhooks inbound

Stripe, Stripe Connect, SES/SNS, WhatsApp, Paddle — ver `opsRegistry.ts`.

CEO pendiente: confirmar suscripción SNS SES (KI-011).
