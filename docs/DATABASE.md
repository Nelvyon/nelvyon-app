# DATABASE — PostgreSQL / Supabase

> Actualizado: 2026-07-21

---

## Sistema de migraciones

| Campo | Valor |
|-------|-------|
| **Directorio** | `backend/db/migrations/` |
| **Total archivos** | 411+ |
| **Última migración** | `517_workspaces_tenant_extension_columns.sql` (automations/workspaces schema) |
| **Shared Memory schema** | 514 + RLS 515 · `schema.proposed.sql` referencia histórica |
| **Runner** | `backend/db/migrate.ts` |
| **Tracking** | Tabla `_migrations (name, executed_at)` |
| **Comando** | `pnpm -C apps/web migrate` |
| **Prod** | Railway `releaseCommand` en deploy Web |

**Rango post-elite CI:** 508–517 (`scripts/validate-post-elite-migrations.mjs`).
**Rango elite SaaS CI:** 401–507 (`scripts/validate-saas-migrations.mjs`).

---

## Alembic (secundario)

- Python: `backend/alembic/versions/` (23 versiones)
- Usado por `backend/Dockerfile` API Python: `alembic upgrade head`
- **No reemplaza** migraciones SQL numeradas del monorepo TS

---

## Conexión

| Entorno | Driver | URL |
|---------|--------|-----|
| Producción | `pg` via `DbClient.ts` | `DATABASE_URL` service_role Supabase o Railway Postgres |
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

### Recientes (508–511)
- `508_saas_prospecting.sql` — prospecting lists
- `509_saas_seo_tracked_keywords.sql` — SEO keywords
- `510_enterprise_performance_indexes.sql` — índices performance
- `511_idempotency_keys.sql` — idempotencia API
- `512_saas_appointments_tenant_start_idx.sql` — índice `(tenant_id, start_at)` para citas (añadir en deploy; no requiere downtime)
- `513_drop_scored_leads.sql` — elimina tabla legacy `scored_leads` (KI-015); SSOT = `SaasLeadScoringService`
- `514_shared_memory.sql` — Shared Memory Phase 2 (entries + audit); flag `NELVYON_SHARED_MEMORY_ENABLED`
- `515_shared_memory_rls.sql` — RLS defensivo Shared Memory (tenant isolation)

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
| `saas_ceo_brief_settings` missing prod | 494 | 🟡 código mitigado; apply migrate |
| Staging mig drift KI-022…026 | 400a–516 | ✅ **resuelto staging 2026-07-21** |
| Prod mig vs staging | 516 | 🟡 **prod max 511** (2026-07-21); staging **516** |
| Ingest vector local-ai (pgvector) | — | ✅ **verified** 2026-07-20 (1559 chunks) |
| Shared Memory 514/515 staging | 514–515 | ✅ KI-021 resuelto · `verified:true` |
| FastAPI RLS post-507 | 516 | ✅ KI-026 resuelto staging · ADR-032 |

---

## Tablas pendientes / ingest

- RAG plataforma: `nelvyon_rag_chunks` (ILIKE adjunct) + LocalVectorStore (pgvector) vía `KnowledgeIngestService`
- **Ingest local-ai [VERIFICADO 2026-07-20]:** Docker UP · Postgres `:5434` healthy · `knowledge_ingest_evidence.json` → `verified:true`, **1559** chunks · orphans 0 · coverage 0.99 · `claimComplete:false`
- **KI-022 [RESUELTO staging 2026-07-20]:** mig `400a_reconcile_legacy_integer_conversations.sql` aplicada · `401` OK · `conversations.id` uuid · `conversation_messages` FK OK.
- **KI-023 [RESUELTO staging 2026-07-20]:** mig `401a_reconcile_legacy_integer_deals.sql` + `402`…`407` OK · `deals.id` uuid + `tenant_id` · pipelines/stages OK · legacy 0 filas.
- **KI-024 [RESUELTO staging 2026-07-20]:** mig `407a_reconcile_legacy_integer_calendar_events.sql` + `408`…`506` OK · `calendar_events` UUID+tenant_id · legacy 0 filas. **Nombre `407a`** (no `408a`): sort `408_*` < `408a_*`.
- **KI-025 [RESUELTO staging 2026-07-21]:** `506a_reconcile_legacy_pre_507_social_posts.sql` + `507`…`515` · `social_posts` UUID+tenant_id · legacy 0 · SM verified. **507 no editada.**
- **KI-021 [RESUELTO staging 2026-07-21]:** 514+515 + RLS Shared Memory · `verified:true` (node-pg fallback en verify script).
- **KI-026 [RESUELTO staging 2026-07-21]:** `516_fastapi_rls_repair.sql` + **ADR-032**. Policies dual-plane (SaaS UUID / FastAPI INT / chatbot JWT). Evidencia: `ki026_rls_isolation_evidence.json` (`ok:true`). SM intacta.
- **Reconciliaciones staging:** `NNNa_*` por sort; `(N-1)a` si `Na` iría después de `N_`.

---

## Comandos útiles

```bash
# Aplicar todas las pendientes
pnpm -C apps/web migrate

# Verificar en SQL
SELECT name, executed_at FROM _migrations ORDER BY executed_at DESC LIMIT 20;
SELECT to_regclass('public.saas_ceo_brief_settings');

# Backup manual
python backend/scripts/db_backup_restore.py --help
```

---

## Listado completo tablas

No duplicar 407 archivos aquí. Generar inventario:

```bash
# En Postgres conectado
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;
```

O inspeccionar `CREATE TABLE` en `backend/db/migrations/*.sql`.
