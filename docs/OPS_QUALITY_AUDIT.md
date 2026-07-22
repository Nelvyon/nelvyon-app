# OPS QUALITY AUDIT — 2026-07-22

## P0 / P1 reales

| ID | Severity | Status | Acción |
|----|----------|--------|--------|
| DNS `app.nelvyon.com` | P0 go-live | **Open** | Humano CNAME → Railway |
| `STAGING_QA_PASSWORD` | P1 smokes | **Open** | Secret CI — no commit |
| Prod IA OFF | Expected | OK | No activar sin CEO |
| Partner payouts OFF | Expected | OK | CEO flag |
| LLM staging | Ops gap | Open | Mesh local-AI arch — no localhost |

## Crons
16 rutas `/api/cron/*` — requieren `CRON_SECRET`. Fail-closed sin secret (no ocultar).

## Backups
`db-backup.yml` — necesita `DATABASE_PUBLIC_URL` (no `railway.internal`). CEO: primer run manual pendiente (TODO).

## Health
`/api/health/live` · `/api/health/ready` — prod **200** post-unify.

## Observabilidad
Private AI metrics flag-gated · no alert spam when IA OFF. Logs Railway sample: Ready + migrate.

## No ocultar
Smokes staging **blocked** por password — documentado, no marcado PASS.
