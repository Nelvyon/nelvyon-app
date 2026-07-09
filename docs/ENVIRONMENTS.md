# ENVIRONMENTS — Entornos

> Sin secretos. Actualizado: 2026-07-09

---

## Producción

| Campo | Valor |
|-------|-------|
| **Plataforma** | Railway |
| **App principal** | `apps/web` (Next.js) |
| **API Python** | `nelvyon-app-production` (FastAPI) — ver `backend/README.md` |
| **Dominio público** | `https://nelvyon.com` ✅ (health live OK); `app.nelvyon.com` en env examples — DNS no verificado desde agente |
| **git_sha verificado** | `815e4c0f0e35` (2026-07-09 post-deploy) |
| **Base de datos** | Supabase Postgres o Railway Postgres via `DATABASE_URL` |
| **NODE_ENV** | `production` |

**Variables obligatorias:** ver `apps/web/.env.example`, `docs/LAUNCH_READY.md`, `CLAUDE.md`.

**Migraciones:** auto en deploy via `releaseCommand`.

---

## Staging

| Campo | Valor |
|-------|-------|
| **Web** | `ideal-victory-staging.up.railway.app` |
| **API Python** | `nelvyon-app-production.up.railway.app` (nombre doc backend/README) |
| **Env file ejemplo** | `backend/env.staging.example` |
| **Smokes** | `scripts/run-staging-p0-smokes.mjs` |

`JWT_SECRET` Web staging debe coincidir con API Python.

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
| `/api/saas/*` | Prod/dev | JWT cookie |
| `/api/cron/*` | Prod | `CRON_SECRET` Bearer |
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
