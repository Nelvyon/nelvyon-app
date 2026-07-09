# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización automática: **2026-07-09 13:05 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Proyecto** | Nelvyon — agencia IA + SaaS B2B |
| **Versión app** | `@nelvyon/web` 0.1.0 |
| **Fecha doc** | 2026-07-09 |
| **Último commit en origin/main** | `815e4c0f` — `docs: add live documentation system with HANDOVER and project context` |
| **Commit previo relevante** | `224a0a36` — `fix: handle saas ceo brief settings table in production` |
| **Rama** | `main` (sync with origin) |
| **Último despliegue prod** | ✅ Railway `@nelvyon/web` — deploy `5c2be62e` SUCCESS 2026-07-09 14:41 CEST |
| **git_sha prod** | `815e4c0f0e35` en `https://nelvyon.com/api/health/live` |

---

## Último trabajo realizado (sesión autónoma 2026-07-09)

1. **Push a `origin/main`** — commits `224a0a36` + `815e4c0f` publicados.
2. **Deploy Railway producción** — build + deploy SUCCESS; health live OK con SHA nuevo.
3. **Validación local** — `tsc --noEmit` OK, `pnpm -C apps/web build` OK.
4. **Railway CLI** — proyecto `truthful-respect` enlazado (production, `@nelvyon/web`).
5. **Scripts utilidad** — `scripts/check-migration-494.mjs`, `scripts/check-cron-ceo-brief.mjs` (requieren SSH Railway o env interno).
6. **Documentación** — actualización post-deploy de todos los archivos vivos en `docs/`.

**Cambios locales sin commitear:** `backend/core/config.py`, `backend/db/load_env_files.py`, `README-dev-Windows.md`, `backend/README.md` (setup dev PC).

---

## Estado Fase 1 — Infraestructura

| Ítem | Estado |
|------|--------|
| Monorepo pnpm | ✅ |
| Next.js prod (`apps/web`) | ✅ código + build + deploy prod |
| FastAPI (`backend/`) | ✅ online `nelvyon-app-production.up.railway.app` |
| Postgres migraciones (407 SQL) | ✅ en repo; última: `511_idempotency_keys.sql` |
| Railway releaseCommand migrate | ✅ configurado; ejecuta en cada deploy Web |
| Migración 494 en prod | 🟡 **inferida aplicada** en deploy 5c2be62e; **SQL no verificado** (sin SSH keys Railway) |
| CEO brief cron post-deploy | 🟡 no verificado HTTP 200 tras deploy (último cron prod: HTTP 500 a las 10:20 UTC, pre-fix) |
| Auth JWT SaaS | ✅ |
| Stripe billing (código) | ✅ |
| SES email (código) | ✅ |
| Redis (código + fallback memoria) | 🟡 |
| Git push commits CEO + docs | ✅ |
| CI Staging Elite Gate | ❌ falló (tests packSeedMetadata + workflow) |
| CI OS Autonomous Gate | ✅ |
| CI Web Quality Gates | ❌ falló |

---

## Estado Fase 2 — IA y Agentes

| Ítem | Estado |
|------|--------|
| Private AI infra (`backend/private-ai/`) | 🟡 preparada, sin LLM activo |
| Agent registry (17 agentes) | 🟡 catálogo; sin runtime LLM |
| RAG (`NelvyonRagStore`) | 🟡 lectura; sin ingest |
| OpenClaw bridge | ❌ deshabilitado por diseño |
| OS packs + orchestrator | ✅ |
| MCP server (`/api/mcp`, stdio) | 🟡 código; 5 tools |

---

## Infraestructura (resumen)

| Componente | Estado |
|------------|--------|
| Docker Desktop | 🟡 |
| Git / GitHub | ✅ |
| Railway | ✅ prod Web deploy OK; Postgres online |
| Supabase | 🟡 documentado; no verificado SQL desde este entorno |
| PostgreSQL | 🟡 prod; SQLite dev local |
| Redis | 🟡 |
| AWS SES | 🟡 |
| Stripe | 🟡 |
| Cloudflare | 🟡 |
| OpenAI | 🟡 vars; opcional |
| n8n | 🟡 blueprint JSON; sin instancia |
| Dominios / DNS / SSL | 🟡 `nelvyon.com` OK; `app.nelvyon.com` no resuelve desde este entorno |

Detalle: `INFRASTRUCTURE.md`, `INTEGRATIONS.md`, `ENVIRONMENTS.md`.

---

## Problemas abiertos

1. **CEO brief cron:** verificar POST `/api/cron/saas-ceo-brief` HTTP 200 tras deploy (requiere SSH Railway o próximo cron 07:00 UTC).
2. **Migración 494:** confirmar en `_migrations` y tablas vía SQL (bloqueado: sin SSH keys en `~/.ssh`).
3. **CI:** Staging Elite Gate y Web Quality Gates fallaron en push `815e4c0f`.
4. **Tests locales:** 7 fallos en `saasWorkflowsS30.test.ts` (`toIso` undefined).
5. **Working tree:** cambios setup dev sin commitear.

---

## Errores conocidos

| Error | Estado | Notas |
|-------|--------|-------|
| `relation "saas_ceo_brief_settings" does not exist` | 🟡 mitigado en código | Migración 494 inferida en deploy; confirmar SQL |
| Mock hubs GHL legacy | ✅ documentado | No tocar rutas mock |

Más: `KNOWN_ISSUES.md`.

---

## Próximo paso EXACTO

**Registrar SSH key en Railway (`ssh-keygen -t ed25519` + `railway ssh keys add`), ejecutar `node scripts/check-migration-494.mjs` dentro del contenedor, y disparar/verificar POST `/api/cron/saas-ceo-brief` (workflow `production-cron.yml` job `saas-ceo-brief` o curl con `CRON_SECRET`).**

---

## Contexto para ChatGPT / Cursor

- **Monorepo:** `apps/web` (Next.js 15) = producción; `backend/` = TS services + Python FastAPI; `frontend/` = Vite legacy (no tocar salvo dev local).
- **Tres capas:** SaaS `/saas/*`, OS `/os/*`, Portal `/portal/*`.
- **No negociable:** ver `CLAUDE.md` — no UI sin API, no borrar migraciones, no activar `coming_soon` sin kickoff.
- **Docs vivos:** tras cualquier cambio importante, actualizar `docs/HANDOVER.md` + archivos afectados en `docs/`.
- **Continuar desarrollo:** leer este archivo → `AI_CONTEXT.md` → módulo específico en `docs/`.
