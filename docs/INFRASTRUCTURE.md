# INFRASTRUCTURE — Infraestructura NELVYON

> Estado real documentado 2026-07-09. Sin secretos.

---

## Resumen

| Componente | Estado | Notas |
|------------|--------|-------|
| **Git** | ✅ | 2.55+; remote GitHub Nelvyon/nelvyon-app |
| **GitHub** | ✅ | Actions: CI, smokes, production-cron |
| **Node.js** | ✅ | v20+ prod Docker; v24 dev local OK |
| **pnpm** | ✅ | 10.33 |
| **Python** | ✅ | 3.10+; FastAPI backend |
| **Docker Desktop** | 🟡 | CLI instalado; daemon no siempre activo |
| **WSL** | — | No documentado en repo |
| **Railway** | 🟡 | Web + API Python separados (docs backend/README) |
| **Supabase** | 🟡 | Postgres + auth; service_role en DATABASE_URL |
| **PostgreSQL** | 🟡 | 16; 407 migraciones SQL |
| **Redis** | 🟡 | Upstash/Railway opcional; in-memory fallback |
| **AWS SES** | 🟡 | eu-west-1 recomendado |
| **Stripe** | 🟡 | Billing + Connect partners |
| **Cloudflare** | 🟡 | DNS/WAF manual (`cloudflare-waf-rules.md`) |
| **OpenAI** | 🟡 | Opcional packs/agents |
| **n8n** | ❌ | Sin instancia; blueprint en `packages/automation-blueprints/` |
| **Sentry** | 🟡 | `NEXT_PUBLIC_SENTRY_DSN` |
| **PostHog** | 🟡 | EU hosting GDPR |

---

## Railway

| Servicio | Artefacto | Puerto |
|----------|-----------|--------|
| **Web** | `apps/web/Dockerfile` | 3000 |
| **API Python** | `backend/Dockerfile` | 8000 |

**Web `railway.json`:**
```json
"releaseCommand": "pnpm exec tsx ../../backend/db/migrate.ts"
```

**Healthchecks:**
- Web: `/api/health/live` (ver docs)
- Python: `/health`

---

## Docker local

| Archivo | Uso |
|---------|-----|
| `Dockerfile` (raíz) | Build Next.js prod |
| `apps/web/Dockerfile` | Railway Web |
| `backend/Dockerfile` | FastAPI + `alembic upgrade head` |
| `backend/docker-compose.test.yml` | Postgres :5433, Redis :6380 tests |

---

## CLI recomendados (opcionales)

| CLI | Estado típico dev |
|-----|-------------------|
| `git` | ✅ |
| `gh` | ❌ opcional |
| `railway` | ❌ opcional |
| `supabase` | ❌ opcional |
| `wrangler` | ❌ opcional (Cloudflare) |

---

## DNS / SSL / Dominios

Documentados en `GUIA_DESPLIEGUE_PRODUCCION.md`, `ENVIRONMENTS.md`:
- Producción: `nelvyon.com`, `app.nelvyon.com` (ver env examples)
- Staging: `ideal-victory-staging.up.railway.app`

---

## Dependencias entre servicios

```
Cloudflare (DNS) → Railway Web → DATABASE_URL → Supabase/Railway Postgres
                              → Redis (opcional)
                              → SES / Stripe (APIs externas)
Railway Python API → misma DATABASE_URL (staging)
GitHub Actions cron → POST /api/cron/* + CRON_SECRET
```

---

## Variables críticas

Ver `ENVIRONMENTS.md` y `apps/web/.env.example`.
