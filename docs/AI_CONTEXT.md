# AI_CONTEXT — Contexto técnico completo NELVYON

> Fuente para IAs. **Sin secretos.** Actualizado: 2026-07-10.

---

## Fase 1 — estado (2026-07-10)

| Prioridad | Estado |
|-----------|--------|
| P0–P2 | ✅ Validadas |
| P3 | ✅ Consolidación (bundles, overrides, audit script) |
| P4 | ✅ Hardening (security-gates, Dependabot, CEO checklist) |
| Auditoría local | ✅ `node scripts/run-phase1-audit.mjs` |
| CEO manual | ⏳ `docs/CEO_FINAL_ACTIONS.md` |
| Fase 2 IA | ❌ No iniciar |

---

## Qué es Nelvyon

Agencia de marketing digital operada por IA + plataforma SaaS B2B. Monorepo **pnpm 10.33**, deploy principal **Railway** (Node 20 + Postgres 16).

---

## Arquitectura (3 capas)

```
┌─────────────────────────────────────────────────────────┐
│ apps/web (Next.js 15.5, React 19, App Router)           │
│  /saas/*  /os/*  /portal/*  /api/*                      │
└────────────┬───────────────────────────────┬────────────┘
             │                               │
┌────────────▼────────────┐    ┌─────────────▼────────────┐
│ backend/saas/*.ts         │    │ backend/ (FastAPI :8000) │
│ Servicios puros, DbClient │    │ Packs, routers legacy    │
└────────────┬────────────┘    └─────────────┬────────────┘
             │                               │
             └───────────────┬───────────────┘
                             ▼
                    PostgreSQL 16 (Supabase/Railway)
                    Redis opcional (Upstash / in-memory)
```

### SaaS (`/saas/*`)
- Layout: `SaasShellLayout` + `SaasSidebar`
- Auth: `requireSaasContext` — JWT cookie httpOnly
- Módulos: CRM, campañas, workflows, billing, pipeline, inbox, etc.

### OS (`/os/*`, `/api/os/*`)
- Motor packs: `apps/web/src/lib/packs/packOrchestrator.ts` → `runGrowthPack`
- PackIds: `local-business-growth`, `ecommerce-growth`, `saas-b2b-growth`
- Auto-aprobación QA ≥ 85: `dbAutoApprovePackDeliverables`

### Portal (`/portal/*`)
- BFF Next.js para revisión/aprobación entregables cliente

---

## Workspaces

| Ruta | Rol |
|------|-----|
| `apps/web/` | **Producto principal** (producción) |
| `backend/` | Servicios TS + Python FastAPI |
| `frontend/` | Vite legacy — dev local; no producción |
| `packages/` | SDK, zapier, etc. |

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend prod | Next.js 15.5, React 19, TS 5.9, Tailwind v4 |
| Backend TS | Clases en `backend/saas/`, `backend/db/DbClient.ts` |
| Backend Python | FastAPI, uvicorn, SQLAlchemy async, Alembic (secundario) |
| DB | Postgres 16; migraciones SQL en `backend/db/migrations/` |
| Email | AWS SES (`backend/email/sesClient.ts`) |
| Billing | Stripe webhooks → `saas_tenants.plan` |
| Cache/queue | Redis / in-memory (`core/redis_adapter.py`, TS ioredis) |
| IA privada | `backend/private-ai/` — providers plugables, default `unconfigured` |
| Observabilidad | Sentry, PostHog (opcional), logs estructurados OBS |

---

## Comandos esenciales

```bash
pnpm -C apps/web dev              # Next.js dev
pnpm run dev:backend              # FastAPI :8000
pnpm run dev:frontend             # Vite legacy :3000
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/web migrate          # Aplicar migraciones SQL
pnpm -C apps/web build            # Build producción
pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm --reporter=dot
```

---

## Variables de entorno (nombres, sin valores)

### Obligatorias producción (Web)
- `DATABASE_URL` — Postgres service_role (Supabase) o Railway Postgres
- `JWT_SECRET` (≥32 chars)
- `TRACKING_SECRET` (fallback JWT)
- `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `CRON_SECRET` — crons `/api/cron/*`
- `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_*`

### Python backend
- `DATABASE_URL`, `JWT_SECRET` / `JWT_SECRET_KEY`, `ENVIRONMENT`
- Ver `backend/core/config.py` (campos Pydantic explícitos)

### Opcionales IA
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- `NELVYON_AI_ENABLED`, `NELVYON_AI_MODE`, `OLLAMA_CONFIGURED`
- `NELVYON_OPENCLAW_BRIDGE_ENABLED`, `NELVYON_OPENCLAW_BRIDGE_URL`

Plantillas: `.env.example`, `apps/web/.env.example`, `backend/.env.railway.example`.

---

## Integraciones

Catálogo código: `backend/saas/integrationsCatalog.ts`  
Detalle estado: `INTEGRATIONS.md`

---

## Base de datos

- **407** archivos `.sql` en `backend/db/migrations/`
- Última: `511_idempotency_keys.sql`
- Runner: `backend/db/migrate.ts` — tabla `_migrations`
- RLS: migración `280_rls_service_role.sql`; backend usa service_role URL

Detalle: `DATABASE.md`

---

## Private AI (estado real)

Per `docs/PRIVATE_AI_ARCHITECTURE.md`:
- Infra lista; **sin modelo instalado**
- **Sin RAG ingest**
- **OpenClaw no conectado**
- 17 agentes en `nelvyonAgentRegistry.ts` (CEO, ventas, SEO, etc.)

---

## Errores / deuda conocida

- Ver `KNOWN_ISSUES.md` — KI-011 (SNS), KI-013/014 (SES dominio + sandbox)
- Fase 2 IA: `NELVYON_AI_ENABLED=0` por diseño

---

## Estado operativo (2026-07-10)

| Campo | Valor |
|-------|-------|
| **Prod Web** | `https://nelvyon.com` — live/ready OK |
| **git_sha prod** | `30404800` (redeploy pendiente → `636a47bc`) |
| **git_sha staging** | `636a47bc` |
| **Migraciones** | 401–511 en repo; releaseCommand en deploy |
| **Crons GH** | SUCCESS con `PRODUCTION_BASE_URL` |

---

## Próximos pasos técnicos

1. CEO: SES dominio + production access (`CEO_FINAL_ACTIONS.md` §4–5)
2. CEO: primer run `Database Backup` workflow
3. Deploy prod con fix `/api/os/health` middleware
4. **No iniciar Fase 2** hasta ops al 100%

---

## Qué NO modificar

Ver `CLAUDE.md`:
- No UI sin API real
- No borrar migraciones
- No tocar `pages/api/saas/*` (410 legacy)
- No hubs GHL mock en `/saas/dashboard/*`
- No hardcodear `JWT_SECRET` / `TRACKING_SECRET`

---

## Índice documentación

| Archivo | Uso |
|---------|-----|
| `HANDOVER.md` | Continuar en 2 min |
| `PROJECT_STATUS.md` | Estado % y resumen |
| `ROADMAP.md` | Fases 1–2 |
| `TODO.md` | Prioridades P0–P4 |
| `CHANGELOG.md` | Historial cambios doc |
| `DECISIONS.md` | ADRs |
| `ARCHITECTURE.md` | Diagramas y flujos |
