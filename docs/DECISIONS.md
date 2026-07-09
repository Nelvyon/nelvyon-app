# DECISIONS — Decisiones técnicas (ADR)

> No eliminar entradas. Añadir nuevas al final.

---

## ADR-001 — Monorepo pnpm con apps/web como producto principal

| Campo | Valor |
|-------|-------|
| **Fecha** | 2025–2026 (evolución) |
| **Decisión** | Next.js en `apps/web` es el deploy Railway; `frontend/` Vite queda legacy |
| **Por qué** | App Router, BFF API routes, SSR, un solo artefacto Docker |
| **Consecuencias** | Dev local puede usar Vite legacy; prod solo `apps/web` |

---

## ADR-002 — Migraciones SQL numeradas vs solo Alembic

| Campo | Valor |
|-------|-------|
| **Fecha** | 2025+ |
| **Decisión** | Fuente de verdad: `backend/db/migrations/*.sql` + `migrate.ts`; Alembic Python secundario |
| **Por qué** | Next.js/TS es el path crítico; Railway releaseCommand ejecuta migrate.ts |
| **Consecuencias** | Dos sistemas coexisten; no borrar SQL; verificar `_migrations` en prod |

---

## ADR-003 — Auth SaaS JWT en cookies httpOnly

| Campo | Valor |
|-------|-------|
| **Fecha** | 2025+ |
| **Decisión** | `JWT_SECRET` en cookie; `requireSaasContext` en rutas `/api/saas/*` |
| **Por qué** | Seguridad XSS; alineación Next.js BFF |
| **Consecuencias** | Usar `127.0.0.1` consistente en dev (cookies) |

---

## ADR-004 — DATABASE_URL service_role (bypass RLS)

| Campo | Valor |
|-------|-------|
| **Fecha** | Migración 280 |
| **Decisión** | Backend usa Postgres service_role; nunca anon key en servidor |
| **Por qué** | RLS para clientes; operaciones BFF necesitan bypass controlado |
| **Consecuencias** | Documentar en `ENVIRONMENTS.md`; rotar si filtra |

---

## ADR-005 — Private AI: preparado pero no obligatorio

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026 (migraciones 503–504) |
| **Decisión** | `UnconfiguredProvider` por defecto; Nelvyon no depende de LLM externo para arrancar |
| **Por qué** | Deploy seguro; activación por env cuando listo |
| **Consecuencias** | Agentes en catálogo sin runtime hasta Fase 2 |

---

## ADR-006 — OpenClaw como plugin opcional

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026 |
| **Decisión** | `DisabledOpenClawBridge` por defecto; Nelvyon posee orquestación |
| **Por qué** | Evitar acoplamiento a orchestrator externo |
| **Consecuencias** | `NELVYON_OPENCLAW_BRIDGE_ENABLED=1` solo si se adopta |

---

## ADR-007 — Settings Python: Pydantic explícito (no __getattr__)

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-07 |
| **Decisión** | `database_url` y campos críticos declarados; `load_env_files()` antes de `Settings()` |
| **Por qué** | Error `AttributeError database_url` en prod/dev sin env |
| **Consecuencias** | Nuevas vars Python → añadir campo en `config.py` |

---

## ADR-008 — CEO brief cron: degradación graceful sin tabla

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-09 |
| **Decisión** | Cron devuelve `skipped: schema_not_ready` en `42P01`; migración 494 sigue siendo fix definitivo |
| **Por qué** | Evitar 500 en cron GitHub Actions mientras migrate no corre |
| **Consecuencias** | Prod debe aplicar 494 para funcionalidad completa |

---

## ADR-009 — Documentación viva en docs/HANDOVER.md

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-09 |
| **Decisión** | HANDOVER.md es fuente de continuidad; actualización obligatoria post-cambio |
| **Por qué** | No depender de memoria humana ni chats previos |
| **Consecuencias** | Regla Cursor `.cursor/rules/live-documentation.mdc` |

---

## ADR-011 — releaseCommand unificado con migrate:prod

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-09 |
| **Decisión** | Railway `releaseCommand` = `pnpm migrate:prod` (apps/web); root = `pnpm -C apps/web migrate:prod` |
| **Por qué** | Comandos `tsx` directos inconsistentes; `migrate-prod.ts` valida `DATABASE_URL` y logs claros |
| **Consecuencias** | Dockerfile runner copia `apps/web/scripts/` para release en imagen prod |

---

## ADR-010 — Verificación prod vía Railway CLI + scripts internos

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-07-09 |
| **Decisión** | Scripts `scripts/check-migration-494.mjs` y `check-cron-ceo-brief.mjs` se ejecutan dentro del contenedor Railway (`railway ssh`) |
| **Por qué** | `DATABASE_URL` prod usa hostname interno `postgres.railway.internal`; `railway run` local falla con ENOTFOUND |
| **Consecuencias** | Requiere SSH keys registradas en Railway; sin ellas solo health/git_sha y releaseCommand inferido |
