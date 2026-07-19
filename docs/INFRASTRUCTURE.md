# INFRASTRUCTURE — Infraestructura NELVYON

> Estado real documentado **2026-07-19**. Sin secretos.

---

## Resumen

| Componente | Estado | Notas |
|------------|--------|-------|
| **Git** | ✅ | remote GitHub Nelvyon/nelvyon-app |
| **GitHub Actions** | ✅ | web-quality-gates · security-gates · smokes · db-backup · ci-minimal (PR only) |
| **Node.js** | ✅ | v20+ prod Docker |
| **pnpm** | ✅ | 10.33 |
| **Python** | ✅ | 3.10+; FastAPI |
| **Docker** | 🟡 | Compose local-ai + test; Desktop ops residual |
| **Railway** | ✅ | Web healthcheck `/api/health/live`; releaseCommand migrate |
| **PostgreSQL** | ✅ | 16; migraciones hasta **514** (validator CI 508–514) |
| **pgvector** | 🟡 | Local stack; residual ops KI-018 |
| **Redis** | 🟡 | Opcional; in-memory fallback |
| **Ollama** | ✅ | Live workforce/Elite cuando servicio local UP |
| **OpenClaw** | 🟡 | Mock certificado; URL real ops |
| **AWS SES** | 🟡 | Dominio OK; **production access DENIED** (KI-014) |
| **Stripe** | 🟡 | Código listo; claves prod ops |
| **Cloudflare** | 🟡 | DNS/WAF manual |
| **Backups / DR** | ✅ | GH Action + restore drill PASS 8/8 (evidencia) |
| **Security headers** | ✅ | SSOT `apps/web/src/lib/security/headers.ts` |
| **Ops dashboard** | ✅ | `GET /api/platform/ops/summary` |

---

## Railway

| Servicio | Artefacto | Puerto |
|----------|-----------|--------|
| **Web** | `apps/web/Dockerfile` | 3000 |
| **API Python** | `backend/Dockerfile` | 8000 |

**Web `railway.json`:**
```json
"releaseCommand": "pnpm migrate:prod",
"healthcheckPath": "/api/health/live"
```

**Ops runbook:** `docs/OPS.md`

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
