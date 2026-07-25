# DATABASE — PostgreSQL / Supabase

> Actualizado: **2026-07-25** — tip **`5a36809c`** · mig **519+520** staging · A/B+concurrency VERIFIED · ADR-062 PREPARED_OFF · prod **BLOCKED_CEO**

---

## ADR-061 — Postgres ERP SSOT (519 reserved + 520 snapshots)

| Campo | Valor |
|-------|-------|
| **Prod** | tip **`5a36809c`** · 519/520 in `_migrations` · **ADR-064 gate** on `migrate:prod` · CEO ack pending |
| **Staging** | auto-migrate continues · tip live previo `5a36809c` hasta deploy gate |
| **SSOT ERP** | `erp_domain_snapshots` · dual-write **PREPARED_OFF** |

## ADR-060 — ERP product surface (catalog v1.7.0 · superseded SSOT by ADR-061)

| Campo | Valor |
|-------|-------|
| **Alcance** | Wire Blocks 26–29+35 · OsCatalogV1 **v1.7.0** · API/UI `/saas/erp/*` · mig **519** schema reserved |
| **SSOT (histórico ADR-060)** | In-memory / process-local — **superseded** by ADR-061 when `DATABASE_URL` set |
| **Fuera de alcance** | Payments · bank · tax · GL · cost · IoT · e-signature · Odoo |

## ADR-057/059 — notas schema

| Campo | Valor |
|-------|-------|
| **Migración nueva** | **No** (Blocks 11–25 + catalog v1.6.0 — sin cambios schema en esos ADR) |
| **Cambios código** | Agency cores + catalog v1.6.0 |
| **Private RAG (Block 24)** | Docker local pgvector path **VERIFIED** (2026-07-25) · **Railway pgvector PREPARED_OFF** · P2 minScore documentado |
| **Datos Pepito** | **No importados** · `pepitoDbForbidden: true` · **untouched** |

## ADR-056 — notas schema

| Campo | Valor |
|-------|-------|
| **Migración nueva** | **No** |
| **Cambios código** | P0 campaign launch block · P1 chat/ai-copy OpenAI gate · mcp.write honesty · shared-memory scopes · meta-ads-pack beta — **sin cambios schema** |
| **Datos Pepito** | **No importados** · `pepitoDbForbidden: true` en código · **untouched** ADR-056 |
| **E2E verificado (staging runtime)** | tip `53149384` · deploy `e514bbd7` · automations/reputation ALL_PASS · sin cambios schema |

## ADR-055 — notas schema

| Campo | Valor |
|-------|-------|
| **Migración nueva** | **No** |
| **E2E verificado** | tip `53149384` · deploy `e514bbd7` · automations/reputation ALL_PASS · sin cambios schema |
| **Datos Pepito** | **No importados** · `pepitoDbForbidden: true` en código |
| **SM/MCP synthetic harness** | Usa tenants sintéticos in-memory en staging drills — **no** nuevas tablas · no implica SM productiva |

## Sistema de migraciones

| Campo | Valor |
|-------|-------|
| **Directorio** | `backend/db/migrations/` |
| **Total archivos** | 411+ |
| **Última migración (repo)** | `520_erp_postgres_persistence.sql` (tip **`9e931f08`**) |
| **Staging verified** | **519** + **520** in `_migrations` (2026-07-25) |
| **Prod verified** | **517** + **518** in `_migrations` (2026-07-22 SSOT DB probe) · **519/520** **not** claimed on prod |
| **Shared Memory schema** | 514 + RLS 515 · `schema.proposed.sql` referencia histórica |
| **Runner** | `backend/db/migrate.ts` |
| **Tracking** | Tabla `_migrations (name, executed_at)` |
| **Comando** | `pnpm -C apps/web migrate` |
| **Prod** | Railway `preDeployCommand` migrate en deploy Web |
| **Nota 519/520** | Staging applied · prod **not** claimed · CI post-elite range still 508–518 until validator bump |

**Rango post-elite CI:** 508–518 (`scripts/validate-post-elite-migrations.mjs`) — **519/520** ERP are post-range until validator updated.  
**SQL SSOT gate:** `scripts/validate-sql-alembic-ssot.mjs` (ADR-002/039) — files + optional DB probe.  
**Rango elite SaaS CI:** 401–507 (`scripts/validate-saas-migrations.mjs`).

---

## Alembic (secundario — no SSOT)

- Python: `backend/alembic/versions/` (23 versiones)
- FastAPI prod: **`SKIP_ALEMBIC=1`** (ADR-039) — Node SQL migrations remain SSOT
- `create_all` may race on shared DB → `is_duplicate_table_error` swallows **only** relation/table already-exists (cause-chain)
- **No reemplaza** migraciones SQL numeradas del monorepo TS

---

## Conexión

| Entorno | Driver | URL |
|---------|--------|-----|
| Producción | `pg` via `DbClient.ts` | `DATABASE_URL` service_role Supabase o Railway Postgres |
| FastAPI prod | asyncpg | **Same** web Postgres (ADR-039) |
| Dev local | SQLite opcional Python | `sqlite+aiosqlite:///./nelvyon_local.db` |
| Tests CI | Postgres Docker | `docker-compose.test.yml` :5433 |

**Regla RLS (mig 280):** Backend usa service_role (bypass RLS). Nunca anon key en servidor.

---

## Tablas clave por dominio

### SaaS core
- `saas_tenants`, `saas_users`, `saas_contacts`, `saas_deals`, `saas_pipeline_*`
- `saas_campanias_*`, `saas_workflows_*`, `saas_inbox_*`
- `saas_autopilot_settings` (453), `saas_integrations_hub` (450)

### Billing
- `saas_tenants.plan` (Stripe webhook)
- `saas_cpq_*` (452), Connect rebilling (500)

### OS / Packs
- `nelvyon_pack_runs`, `os_*` (certifications, learning, recurring, etc.)

### IA / Agentes (Fase 2)
- `nelvyon_rag_chunks` (503+)
- `saas_tenant_memory` (497)
- `saas_agent_runs` (492)
- `saas_mcp_tool_audit` (493)
- **`saas_ceo_brief_settings`** (494) — ✅ prod (2026-07-09)
- **`saas_ceo_brief_runs`** (494) — índice `idx_ceo_brief_runs_tenant_created`

### Private AI
- `504_private_ai_modular.sql`, `503_private_ai_phase2.sql`

### Recientes (508–520)
- `508_saas_prospecting.sql` — prospecting lists
- `509_saas_seo_tracked_keywords.sql` — SEO keywords
- `510_enterprise_performance_indexes.sql` — índices performance
- `511_idempotency_keys.sql` — idempotencia API
- `512_saas_appointments_tenant_start_idx.sql` — índice `(tenant_id, start_at)` para citas
- `513_drop_scored_leads.sql` — elimina tabla legacy `scored_leads` (KI-015)
- `514_shared_memory.sql` — Shared Memory Phase 2; flag `NELVYON_SHARED_MEMORY_ENABLED`
- `515_shared_memory_rls.sql` — RLS defensivo Shared Memory
- `516_fastapi_rls_repair.sql` — FastAPI RLS dual-plane (KI-026)
- `517_workspaces_tenant_extension_columns.sql` — `workspaces.timezone` · **prod verified**
- `518_workflows_list_columns.sql` — `workflows.is_active` · **prod verified**
- `519_erp_non_financial_cores.sql` — reserved ERP tables (suppliers/PO/inventory/warehouses/stock_moves/MO/`saas_projects_erp`) · RLS comments only · **staging applied**
- `520_erp_postgres_persistence.sql` — `erp_domain_snapshots` + companions + `erp_audit_events` + RLS · API `with*Persistence` · **staging applied** · restart **ALL_PASS**

---

## Índices y constraints

- Definidos en cada archivo `.sql`
- Ejemplo CEO brief: `idx_ceo_brief_runs_tenant_created`
- Performance: migración 510 (enterprise)

---

## RLS

- `280_rls_service_role.sql` — habilitar RLS tablas cliente
- Auditoría: `backend/db/rls-audit-report.md`

---

## Funciones / triggers

- Distribuidas en migraciones por módulo
- Consolidado parcial: `507_fastapi_runtime_schemas.sql` (statements tolerantes a drift)

---

## Problemas conocidos DB

| Problema | Migración | Estado |
|----------|-----------|--------|
| Staging mig drift KI-022…026 | 400a–516 | ✅ **resuelto staging 2026-07-21** |
| Prod mig tip | 517–518 | ✅ **prod verified 2026-07-22** (SSOT DB probe) |
| Ingest vector local-ai (pgvector) | — | ✅ **verified** 2026-07-20 (1559 chunks) |
| Shared Memory 514/515 staging | 514–515 | ✅ KI-021 · `verified:true` |
| FastAPI RLS post-507 | 516 | ✅ KI-026 · ADR-032 |
| Alembic vs SQL SSOT on shared DB | — | ✅ ADR-039 · `SKIP_ALEMBIC=1` · DuplicateTable guard |

---

## Tablas pendientes / ingest

- RAG plataforma: `nelvyon_rag_chunks` (ILIKE adjunct) + LocalVectorStore (pgvector) vía `KnowledgeIngestService`
