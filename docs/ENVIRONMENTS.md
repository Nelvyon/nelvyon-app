# ENVIRONMENTS — Entornos

> Sin secretos. Actualizado: **2026-07-28** · tip `203d5e02` · canary prod **KILL ON** · `claimReady: false`

---

## Producción

| Campo | Valor |
|-------|-------|
| **Plataforma** | Railway |
| **App principal** | `apps/web` (Next.js) · servicio `@nelvyon/web` |
| **API Python** | FastAPI separado — ver `backend/README.md` |
| **Dominio público** | `https://nelvyon.com` |
| **git_sha tip remoto** | `23dbe397` (repo cerrado + staging revalidado) |
| **Base de datos** | Postgres via `DATABASE_URL` |
| **SES_REGION** | `eu-west-1` |
| **Canary IA** | **KILL ON** — ver `docs/ops/CANARY_IA_FLAGS.md` |
| **Mig 521/522** | **NOT applied** (ADR-064 CEO) |
| **NODE_ENV** | `production` |

**Variables obligatorias:** ver `apps/web/.env.example`, `docs/LAUNCH_READY.md`, `CLAUDE.md`.

**Migraciones:** auto en deploy via `preDeployCommand` (`pnpm -C apps/web migrate:prod`) � staging OK; prod gated.

---

## Staging

| Campo | Valor |
|-------|-------|
| **Web** | `https://ideal-victory-staging.up.railway.app` (`ideal-victory`) |
| **API Python** | `comfortable-empathy` (staging) |
| **Deploy verificado** | `56df6a6e` SUCCESS · tip código `40099898`+docs |
| **SES_REGION** | `eu-west-1` (alineado 2026-07-28) |
| **Mig 521/522** | Applied · reconfirmed post-deploy |
| **Canary IA prod flags** | N/A en staging web; prod remains KILL |
| **Mesh runbook** | `docs/ops/MESH_OPTION_A_STAGING.md` |
| **Smokes** | `scripts/run-staging-p0-smokes.mjs` · yellow-queue · honesty/workflows |

`JWT_SECRET` Web staging debe coincidir con API Python del mismo entorno.

---

## Desarrollo local

| Campo | Valor |
|-------|-------|
| **Next.js** | `pnpm -C apps/web dev` → :3000 |
| **Vite legacy** | `pnpm run dev:frontend` → :3000 |
| **FastAPI** | `pnpm run dev:backend` → :8000 |
| **DB default** | SQLite (`DATABASE_URL` en `.env` raíz) |
| **Cookies** | Usar `http://127.0.0.1:3000` (no mezclar localhost) |

**Archivos env (gitignored):**
- `.env` (raíz) — cargado por Python `load_env_files()`
- `frontend/.env.development.local` — proxy Vite
- `apps/web/.env.local` — Next.js (opcional Supabase)

**Guía:** `README-dev-Windows.md`

---

## Test / CI

| Campo | Valor |
|-------|-------|
| **Vitest** | SQLite o mocks; suite en `apps/web` |
| **Integration** | `docker-compose.test.yml` Postgres :5433, Redis :6380 |
| **GitHub Actions** | Variables en workflows; ver `.github/workflows/` |

---

## URLs API importantes

| Ruta | Entorno | Auth |
|------|---------|------|
| `/api/health/live` | Todos | Público |
| `/api/health/ready` | Todos | Público |
| `/api/health/deep` | Prod | `CRON_SECRET` |
| `/api/platform/ops/summary` | Prod | Platform admin / `CRON_SECRET` |
| `/api/saas/*` | Prod/dev | JWT cookie |
| `/api/cron/*` | Prod | `x-cron-secret` (algunas rutas tambi�n aceptan Bearer flexible) |
| `/api/webhooks/stripe` | Prod | Stripe signature |
| `backend :8000/health` | Dev | Público |
| `backend :8000/docs` | Dev | OpenAPI |

---

## Dependencias por entorno

| Servicio | Prod | Staging | Local |
|----------|------|---------|-------|
| Postgres | ✅ | ✅ | 🟡 SQLite |
| Redis | 🟡 | 🟡 | ❌ in-memory |
| SES | ✅ | 🟡 test | ❌ |
| Stripe | ✅ live/test | test | ❌ |
| OpenAI | 🟡 | 🟡 | ❌ |

---

## Supabase

- Project ref en `apps/web/.env.example` (placeholder)
- `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` — solo browser
- `DATABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — servidor

