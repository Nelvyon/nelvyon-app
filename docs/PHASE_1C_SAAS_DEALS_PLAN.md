# Fase 1C — Plan técnico `saas_deals` (solo especificación)

**No implementar en 1C.** Preparación para pipeline unificado post-contactos.

## Tablas legacy de deals

| Tabla | Modelo / servicio | Alcance | Notas |
|-------|-------------------|---------|-------|
| `deals` | `models/deals.py`, `dashboard_metrics`, `global_dashboard` | `user_id` + `workspace_id`, ID entero | Pipeline Vite/FastAPI principal |
| `crm_deals` | `backend/migrations/crm.sql`, `crm_service.py` | `workspace_id`, UUID, FK `crm_contacts` | API `/api/crm/*` |
| `pipeline_deals` | `models/pipeline_deals.py`, entities API | `workspace_id`, entidad genérica | OS / builders |

Stages divergentes:

- `deals`: `core.deal_stages` (won/lost/open normalizados)
- `crm_deals`: `lead`, `qualified`, `proposal`, `negotiation`, `closed_won`, `closed_lost`
- `saas_contacts.pipeline_stage`: `new`, `contacted`, `qualified`, `proposal`, `won`, `lost` (hoy en contacto, no deal)

## Campos propuestos para `saas_deals`

Alineado con `saas_contacts` y RLS por `tenant_id`:

```sql
CREATE TABLE saas_deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES saas_contacts(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  value           NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  stage           TEXT NOT NULL DEFAULT 'lead'
    CHECK (stage IN ('lead','qualified','proposal','negotiation','won','lost')),
  probability     INT NOT NULL DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
  expected_close  DATE,
  notes           TEXT,
  legacy_source   TEXT,           -- 'deals' | 'crm_deals' | 'pipeline_deals'
  legacy_id       TEXT,           -- id origen para idempotencia ETL
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, legacy_source, legacy_id)
);
```

Índices: `(tenant_id, stage)`, `(tenant_id, contact_id)`, `(tenant_id, created_at DESC)`.

## Relación con `saas_contacts`

- FK opcional `contact_id` → persona del deal.
- Pipeline summary actual en `SaasCrmService.getPipelineSummary` agrupa por `saas_contacts.pipeline_stage`; tras `saas_deals`, mover KPIs de valor/etapa a deals y dejar contacto como rol “cuenta/persona”.
- Bridge: `saas_tenants.workspace_id` (igual que contactos).

## ETL / migración pipeline (fase posterior)

1. **Inventario** por workspace: conteos `deals`, `crm_deals`, `pipeline_deals`.
2. **Mapeo stage** tabla unificada → `saas_deals.stage` (documentar pérdidas: p. ej. `contacted` solo en contacto).
3. **Resolución contacto**: `crm_deals.contact_id` → UUID `saas_contacts` vía ETL key `(tenant, legacy_source, legacy_id)`; `deals.contact_id` entero → lookup `contacts` / ETL.
4. **Dry-run / apply** patrón `SaasCrmEtlService` (sin delete legacy).
5. **Métricas hybrid** temporal: `GREATEST(saas_deals, sum(legacy))` — mismo patrón que `saas_contact_quota.py`.
6. **saas-only** cuando legacy vacío por tenant.

## APIs objetivo (no construir aún)

- `GET/POST /api/saas/crm/deals`
- `GET /api/saas/crm/pipeline` — agregar por `saas_deals.stage` + valor
- Deprecar gradualmente `/api/crm/deals` y KPIs `deals` en dashboards

## Orden recomendado antes de OS

1. Cerrar 1C contactos (métricas + cuotas) ✅
2. ETL deals dry-run por tenant piloto
3. `saas_deals` + `SaasCrmService` extendido
4. Redirigir `dashboard_metrics` / `global_dashboard` pipeline a hybrid deals
5. OS agents (`CrmService.ts`) leen `saas_*` solo tras guardrails

## Riesgos

- Triple duplicidad (`deals` + `crm_deals` + `pipeline_deals`) puede inflar GREATEST si no se deduplica por `legacy_source`/`legacy_id`.
- `deals` usa `contact_id` integer; requiere tabla de enlace post-ETL contactos.
- Win rate hoy difiere entre routers (`won/total` vs `won/(won+lost)`); unificar al migrar.
