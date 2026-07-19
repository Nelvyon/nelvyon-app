# AI_CONTEXT — Contexto técnico completo NELVYON

> Fuente para IAs. **Sin secretos.** Actualizado: 2026-07-16.

---

## Fase 1 — estado (2026-07-10)

| Prioridad | Estado |
|-----------|--------|
| P0–P2 | ✅ Validadas |
| P3 | ✅ Consolidación (bundles, overrides, audit script) |
| P4 | ✅ Hardening (security-gates, Dependabot, CEO checklist) |
| Auditoría local | ✅ `node scripts/run-phase1-audit.mjs` |
| CEO manual | ⏳ `docs/CEO_FINAL_ACTIONS.md` |
| Fase 2 especialización | ✅ Certificada 15/15 × 3/3 |
| Fase 2 Model Router | ✅ Certificado + wired SaaS (ADR-015) |
| Fase 2 MCP Productivo | ✅ CERTIFIED — `mcp_certification_final.json` |
| Prep Shared Memory / Orch / Agents / Panel | ✅ Contratos ADR-017 — runtime OFF |

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

- **408** archivos `.sql` en `backend/db/migrations/`
- Última: `512_saas_appointments_tenant_start_idx.sql`
- Propuesta no aplicada: `backend/shared-memory/schema.proposed.sql`
- Runner: `backend/db/migrate.ts` — tabla `_migrations`
- RLS: migración `280_rls_service_role.sql`; backend usa service_role URL

Detalle: `DATABASE.md`

---

## Private AI (estado real)

- **Runtime wired:** `LocalModelRouterProvider` → Model Router certificado (`ADR-015`)
- API: `POST /api/saas/private-ai/inference`, `GET .../router-health`
- Legacy fallback: `LocalOllamaProvider` → `OllamaClient` (HTTP SSOT)
- RAG: `LocalRagRetriever` (cert) vs `NelvyonRagStore` (KI-005 dual)
- **Shared Memory:** runtime ADR-024 · **wired** Context Engine · mig 514 · flag OFF
- **RAG:** UnifiedRagStore ADR-025 (prefer local → ILIKE fallback)
- **OpenClaw:** HttpOpenClawBridge si Memory+flag+URL; si no Disabled
- **Orquestador / Panel / PromptRegistry / Metrics / Tool map:** ver `PHASE2_PREP_INDEX.md`
- 17 agentes runtime + 23 especialistas (`backend/agents/`)
- HMAC SaaS: `requireHmacSecret()` fail-closed (`backend/saas/hmacSecret.ts`)

### Lead scoring

- `/api/saas/lead-scoring` → `SaasLeadScoringService` (SSOT)
- `/api/saas/lead-scoring/leads` → **410 Gone** (ADR-023; mig 513)

---

## Errores / deuda conocida

- Ver `KNOWN_ISSUES.md` — KI-005 (dual RAG), KI-014 (SES production), KI-012 (npm high)
- Auditoría maestra: `docs/MASTER_AUDIT_2026-07-16.md`

---

## Estado operativo (2026-07-17)

| Campo | Valor |
|-------|-------|
| **Prod Web** | `https://nelvyon.com` — live/ready OK |
| **MCP Productivo** | ✅ CERTIFIED — soak 7200040 ms |
| **Migraciones** | Hasta **514** (`514_shared_memory`) |
| **Fase 2** | Shared Memory runtime + orch/panel (flags OFF) |

---

## Próximos pasos técnicos

1. Ops: migrate 514 + opcional `NELVYON_SHARED_MEMORY_ENABLED=1`
2. Ops OpenClaw: sandbox URL + flags (+ opcional `NELVYON_OPENCLAW_DELEGATE=1`)
3. Ops: ingest corpus RAG vector (cutover KI-005)
4. CEO: SES KI-014 · Stripe · STAGING_* (Fase 1)
6. **No declarar OS/SaaS COMPLETADOS** hasta criterios en `OS_SAAS_FINAL_CERTIFICATION.md`

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
