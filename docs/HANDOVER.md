# HANDOVER — NELVYON

> **Lee este archivo primero.** Tiempo de lectura: ~2 minutos.  
> Última actualización automática: **2026-07-09 12:32 UTC**

---

## Estado actual

| Campo | Valor |
|-------|-------|
| **Proyecto** | Nelvyon — agencia IA + SaaS B2B |
| **Versión app** | `@nelvyon/web` 0.1.0 |
| **Fecha doc** | 2026-07-09 |
| **Último commit** | `224a0a36` — `fix: handle saas ceo brief settings table in production` |
| **Rama** | `main` (ahead 1) |
| **Último despliegue** | No verificado desde este entorno (aplicar push + Railway deploy) |

---

## Último trabajo realizado

1. **Fix producción CEO brief cron** — `/api/cron/saas-ceo-brief` ya no crashea con `42P01` si falta `saas_ceo_brief_settings`.
2. **Migración existente** — `494_saas_ceo_brief.sql` (tablas `saas_ceo_brief_settings`, `saas_ceo_brief_runs`).
3. **Tests + build** — 3 tests nuevos, `tsc` OK, `pnpm -C apps/web build` OK.
4. **Setup PC dev** (sesión previa, sin commit) — `config.py` Pydantic, `.env` local, `README-dev-Windows.md`.

**Cambios locales sin commitear:** `backend/core/config.py`, `backend/db/load_env_files.py`, `README-dev-Windows.md`, `backend/README.md`.

---

## Estado Fase 1 — Infraestructura

| Ítem | Estado |
|------|--------|
| Monorepo pnpm | ✅ |
| Next.js prod (`apps/web`) | ✅ código + build |
| FastAPI (`backend/`) | ✅ |
| Postgres migraciones (407 SQL) | ✅ en repo; última: `511_idempotency_keys.sql` |
| Railway releaseCommand migrate | ✅ `apps/web/railway.json` |
| Auth JWT SaaS | ✅ |
| Stripe billing (código) | ✅ |
| SES email (código) | ✅ |
| Redis (código + fallback memoria) | 🟡 |
| Docker local | 🟡 CLI instalado; daemon no verificado |
| Supabase prod | 🟡 documentado; no verificado aquí |
| Cloudflare DNS/WAF | 🟡 docs; no verificado aquí |
| Migración 494 en prod | ❌ pendiente aplicar (causa raíz error CEO brief) |
| Git push commit CEO fix | ❌ pendiente |

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
| WSL | — no documentado en repo |
| Git / GitHub | ✅ |
| Railway | 🟡 |
| Supabase | 🟡 |
| PostgreSQL | 🟡 prod; SQLite dev local |
| Redis | 🟡 |
| AWS SES | 🟡 |
| Stripe | 🟡 |
| Cloudflare | 🟡 |
| OpenAI | 🟡 vars; opcional |
| n8n | 🟡 blueprint JSON; sin instancia |
| Dominios / DNS / SSL | 🟡 ver `ENVIRONMENTS.md` |

Detalle: `INFRASTRUCTURE.md`, `INTEGRATIONS.md`, `ENVIRONMENTS.md`.

---

## Problemas abiertos

1. **Prod:** migración `494_saas_ceo_brief.sql` no aplicada → cron degradado hasta migrate.
2. **Git:** commit `224a0a36` sin push a `origin/main`.
3. **Working tree:** cambios de setup dev sin commitear (config/env docs).
4. **CLAUDE.md desactualizado:** indica última migración `507`; repo tiene hasta `511`.

---

## Errores conocidos

| Error | Estado | Notas |
|-------|--------|-------|
| `relation "saas_ceo_brief_settings" does not exist` | 🟡 mitigado en código | Aplicar migración 494 en prod |
| Mock hubs GHL legacy | ✅ documentado | No tocar rutas mock |

Más: `KNOWN_ISSUES.md`.

---

## Próximo paso EXACTO

**Push del commit `224a0a36` y deploy Railway Web; verificar en prod que `pnpm exec tsx ../../backend/db/migrate.ts` ejecuta `494_saas_ceo_brief.sql` (o aplicar SQL manual en Supabase); confirmar POST `/api/cron/saas-ceo-brief` devuelve `processed > 0` o `skipped` solo si no hay tenants.**

---

## Contexto para ChatGPT / Cursor

- **Monorepo:** `apps/web` (Next.js 15) = producción; `backend/` = TS services + Python FastAPI; `frontend/` = Vite legacy (no tocar salvo dev local).
- **Tres capas:** SaaS `/saas/*`, OS `/os/*`, Portal `/portal/*`.
- **No negociable:** ver `CLAUDE.md` — no UI sin API, no borrar migraciones, no activar `coming_soon` sin kickoff.
- **Docs vivos:** tras cualquier cambio importante, actualizar `docs/HANDOVER.md` + archivos afectados en `docs/`.
- **Continuar desarrollo:** leer este archivo → `AI_CONTEXT.md` → módulo específico en `docs/`.
