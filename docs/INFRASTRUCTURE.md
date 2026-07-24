# INFRASTRUCTURE — Infraestructura NELVYON

> Estado real documentado **2026-07-24**. Sin secretos.

---

## Resumen

| Componente | Estado | Notas |
|------------|--------|-------|
| **Git** | ✅ | remote GitHub Nelvyon/nelvyon-app |
| **GitHub Actions** | ✅ | web-quality-gates · security-gates · smokes · db-backup · ci-minimal (PR only) |
| **Node.js** | ✅ | v20+ prod Docker |
| **pnpm** | ✅ | 10.33 |
| **Python** | ✅ | 3.10+; FastAPI |
| **Docker** | 🟡 | Desktop often DOWN for restore drill |
| **Railway prod** | ✅ | `@nelvyon/web` · IA/mesh/OpenAI keys **ABSENT** |
| **Railway staging** | ✅ mesh | tip `4d331b55` · social ADR-052 E2E ALL_PASS · ADR-048 no Matomo/Umami |
| **Ollama** | ✅ local mesh | Tailscale only · no public port |
| **OpenAI** | ❌ | ABSENT prod |
| **OSS tools externos** | ❌ no install | ADR-048 Matomo/Umami REJECT |
| **OpenClaw / Visual / Paid social** | ❌ OFF | ADR-051/052 PREPARED_OFF |
| **Costes** | **0** | |

---

## Railway

| Servicio | Artefacto | Puerto |
|----------|-----------|--------|
| **Web** | Dockerfile **raíz** (`/Dockerfile`) vía `railway.toml` | 3000 |
| **API Python** | `backend/Dockerfile` | 8000 |

**Web config-as-code (root — lo que usa prod):** `/railway.toml`
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
preDeployCommand = ["pnpm -C apps/web migrate:prod"]
healthcheckPath = "/api/health/live"
```

**KI-029:** `releaseCommand` previo no corría; `preDeployCommand` vacío en manifest. Fix versionado (no UI). Runner copia `apps/web/scripts` + manifests; `WORKDIR /app`.

**KI-030:** `next.config.ts` resuelve `./src/lib/security/headers` desde cwd. CMD runner: `sh -c "cd /app/apps/web && exec node server.js"` (WORKDIR sigue `/app` para preDeploy migrate). Evidencia local 2026-07-22: Ready sin module error.

**Ops runbook:** `docs/OPS.md`

---

## Docker local

| Archivo | Uso |
|---------|-----|
| `Dockerfile` (raíz) | Build Next.js prod |
| `apps/web/Dockerfile` | Railway Web |
| `backend/Dockerfile` | FastAPI · `SKIP_ALEMBIC=1` skips Alembic (SQL SSOT); alembic non-fatal otherwise |
| `backend/docker-compose.test.yml` | Postgres :5433, Redis :6380 tests |
| `backend/local-ai/docker-compose.yml` | Postgres+pgvector **127.0.0.1:5434** — Brain ingest **verified** 2026-07-20 |

---

## CLI recomendados (opcionales)

| CLI | Estado típico dev |
|-----|-------------------|
| `git` | ✅ |
| `gh` | ❌ opcional |
| `railway` | ❌ opcional — Bloque 2: CLI temporal staging → repair `400a`+`401` → FATAL @402 → **restaurado a production** / `@nelvyon/web` |
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
