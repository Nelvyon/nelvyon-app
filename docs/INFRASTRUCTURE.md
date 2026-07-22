# INFRASTRUCTURE — Infraestructura NELVYON

> Estado real documentado **2026-07-22**. Sin secretos.

---

## Resumen

| Componente | Estado | Notas |
|------------|--------|-------|
| **Git** | ✅ | remote GitHub Nelvyon/nelvyon-app |
| **GitHub Actions** | ✅ | web-quality-gates · security-gates · smokes · db-backup · ci-minimal (PR only) |
| **Node.js** | ✅ | v20+ prod Docker |
| **pnpm** | ✅ | 10.33 |
| **Python** | ✅ | 3.10+; FastAPI |
| **Docker** | ✅ | Desktop UP 2026-07-22. `nelvyon-test-postgres` :5433 healthy · `nelvyon-local-ai-postgres` :5434 healthy. |
| **Railway** | ✅ | Web **SUCCESS** SHA `bba71f14` · health live/ready 200 · KI-R030 · schema ≥516 (KI-R029) · **no deploy** esta pasada |
| **PostgreSQL** | ✅ repo / ✅ prod mig / ✅ local test | Staging: **`516`**. Prod: **512–516** (KI-R029). Local test `nelvyon_test` :5433 migrated+seed QA 2026-07-22. |
| **pgvector** | ✅ local / ✅ staging SM | Ingest Brain **verified** local (1559 chunks); staging Shared Memory **verified:true** (KI-021) |
| **Redis** | 🟡 | Opcional; in-memory fallback |
| **Ollama** | ✅ local | 2026-07-22: `127.0.0.1:11434` · 6 models · primary autonomous LLM · OpenAI **opt-in only** (`AUTONOMOUS_ALLOW_OPENAI`). Phase C 3b qa=55 / 8b qa=89 · HTTP kickoff `mode=real` → `needs_review` on 3b. **No** set staging `OLLAMA_HOST=localhost` (Railway cannot reach PC). |
| **OpenClaw** | 🟡 | Mock certificado; URL real ops |
| **AWS SES** | ✅ | Production access GRANTED 2026-07-21 · self-send OK · KI-R014 |
| **Stripe** | ✅ | sk_live + webhook; price-audit **allValid=true** (KI-R028) |
| **Cloudflare** | 🟡 | Railway domain `app.nelvyon.com` **added**; CF DNS pending — CNAME `app` → `uzrknbzy.up.railway.app` + TXT verify (`docs/ops/DNS_APP_NELVYON.md`). No MFA bypass. |
| **Backups / DR** | ✅ | GH Action + restore drill PASS 8/8 (evidencia) |
| **Security headers** | ✅ | SSOT `apps/web/src/lib/security/headers.ts` |
| **Ops dashboard** | ✅ | `GET /api/platform/ops/summary` |

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
| `backend/Dockerfile` | FastAPI + `alembic upgrade head` |
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
