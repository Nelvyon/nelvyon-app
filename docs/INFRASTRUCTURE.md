# INFRASTRUCTURE — Infraestructura NELVYON

> Estado real documentado **2026-07-24** (ADR-056 elite absolute audit). Sin secretos.

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
| **Railway prod** | ✅ | `@nelvyon/web` · IA/mesh/OpenAI keys **ABSENT** · ADR-056 flag read verified (brief switch, restored) |
| **Railway staging** | ✅ | `ideal-victory` Online · runtime ADR-055 **`53149384`** · deploy **`e514bbd7`** SUCCESS · ADR-056 fixes **uncommitted** (tip TBA · base `6364c28c`) · https://ideal-victory-staging.up.railway.app |
| **OpenClaw** | ✅ staging_mock / ❌ prod | ADR-055 deepened · canary doc PENDING_CEO |
| **Auditor** | ✅ staging / ❌ prod | ADR-055 live (13 packs) |
| **SM/MCP synthetic** | ✅ staging | flags **ON** · productivo **0** · harness unit tests PASS · smoke Windows fix |
| **Visual spend** | ❌ OFF | creative_direction + decision matrix |
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
| `railway` | ❌ opcional — ADR-056: CLI briefly switched to prod for flag read (`NELVYON_*` ABSENT) → **restored to staging** / re-linked `ideal-victory` |
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

## ADR-055/056 — flags staging (synthetic SM/MCP + Ollama mesh)

> Staging URL: https://ideal-victory-staging.up.railway.app  
> **Runtime hoy:** ADR-055 (`53149384`) · deploy **`e514bbd7`** SUCCESS · ADR-056 code fixes **local uncommitted**.  
> **Ollama:** `OLLAMA_HOST=http://100.102.207.30:11434` — Tailscale CGNAT private IP (**not public**).

| Flag | Staging live | Prod |
|------|--------------|------|
| `AI_ENABLED` | **1** (staging only) | ABSENT/OFF |
| `OLLAMA_HOST` | `http://100.102.207.30:11434` (Tailscale private) | ABSENT |
| `NELVYON_PACK_INDEPENDENT_AUDITOR` | 1 | 0 |
| `NELVYON_OPENCLAW_BRIDGE_ENABLED` + `NELVYON_OPENCLAW_STAGING_MODE` | 1 | 0 |
| `NELVYON_SHARED_MEMORY_STAGING` | **1** | 0 |
| `NELVYON_MCP_STAGING_SYNTHETIC` | **1** | 0 |
| `NELVYON_AUTOMATIONS_OPS_PACK` | 1 | 0 |
| `NELVYON_REPUTATION_OPS_PACK` | 1 | 0 |
| `NELVYON_SHARED_MEMORY_ENABLED` | 0 | 0/ABSENT |
| `NELVYON_MCP_PRODUCTIVE_ENABLED` | 0 | 0/ABSENT |
| `NELVYON_VISUAL_GENERATION_ENABLED` | 0 | 0/ABSENT |
| `AUTONOMOUS_ALLOW_OPENAI` | 0 | ABSENT |
| `NELVYON_CEO_PARTNER_PAYOUTS` | 0 | 0/ABSENT |

Código: `backend/agency/StagingSharedMemoryMcpHarness.ts`. Synthetic **≠** productivo.

---

## Variables críticas

Ver `ENVIRONMENTS.md` y `apps/web/.env.example`.
