# Fase 3A — SaaS deals y pipeline oficial

## Objetivo

Pipeline comercial **oficial del producto SaaS** (`saas_deals`), separado de:

| Tabla / API | Uso |
|-------------|-----|
| `os_deals` | Operación interna NELVYON OS |
| `deals` | Legacy workspace |
| `crm_deals` | Legacy CRM UUID |
| `pipeline_deals` | Legacy pipeline nombre |

## Tabla `saas_deals`

Migración: `backend/db/migrations/312_saas_deals.sql`  
RLS: `backend/db/migrations/313_saas_deals_rls.sql`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | FK `saas_tenants`, obligatorio |
| contact_id | UUID | FK `saas_contacts`, opcional |
| title | TEXT | Obligatorio |
| value | NUMERIC(14,2) | Default 0 |
| currency | TEXT | Default EUR |
| stage | TEXT | `new`, `contacted`, `qualified`, `proposal`, `won`, `lost` |
| probability | INTEGER | 0–100 |
| expected_close_date | DATE | Opcional |
| source | TEXT | Origen manual o tag ETL |
| owner_user_id | TEXT | UUID usuario opcional |
| notes | TEXT | |
| created_at / updated_at | TIMESTAMPTZ | |

## Servicio y rutas

**Servicio:** `SaasDealsService` (`backend/saas/SaasDealsService.ts`)

**Prefijo API:** `/api/saas/deals` (Next.js, auth JWT + tenant vía `SaasOnboardingService`)

| Método | Ruta | Acción |
|--------|------|--------|
| GET | `/api/saas/deals` | Listar (`stage`, `contact_id`, `search`, `open_only`) |
| POST | `/api/saas/deals` | Crear |
| GET | `/api/saas/deals/[dealId]` | Detalle |
| PATCH | `/api/saas/deals/[dealId]` | Actualizar |
| DELETE | `/api/saas/deals/[dealId]` | Eliminar |
| PATCH | `/api/saas/deals/[dealId]/stage` | Cambiar etapa (`stage`, `probability` opcional) |
| GET | `/api/saas/deals/metrics` | Métricas pipeline |
| POST | `/api/saas/deals/etl` | ETL legacy **dry-run** (solo tenant autenticado) |

### Métricas (`getMetrics`)

- `openCount` — etapas abiertas (new → proposal)
- `wonCount` / `lostCount`
- `pipelineValue` — suma valor deals abiertos
- `wonValue` — suma deals ganados
- `forecastValue` — Σ (value × probability/100) en abiertos
- `byStage[]` — conteo y valor por etapa + conversión simplificada

## Relación con `saas_contacts`

`GET /api/saas/crm/contacts/[contactId]` incluye **`dealsContext`**:

```json
{
  "contact": { ... },
  "dealsContext": {
    "deals": [],
    "dealCount": 0,
    "totalValue": 0,
    "primaryStage": "proposal",
    "recentActivities": []
  }
}
```

- **deals** — oportunidades vinculadas al contacto
- **totalValue** — suma `value`
- **primaryStage** — etapa del deal abierto de mayor valor (o el más reciente)
- **recentActivities** — últimas 10 de `saas_contact_activities`

Sin rediseño UI; el contrato API está listo para Fase 3B.

## ETL legacy deals

**Servicio:** `SaasDealsEtlService`  
**Fuentes:** `deals`, `crm_deals`, `pipeline_deals`

### Reglas

- **No borra** tablas legacy
- **Dedupe:** `tenant + contact_id + título normalizado + valor`
- **Conflicts:** varias filas legacy con misma clave → reporte, no insert
- **contact_id:** resuelve vía tags `etl:legacy_id:contacts:*` / `crm_contacts:*` en `saas_contacts`
- **source** en fila insertada = `etl:legacy_id:{source}:{id}` para idempotencia

### Dry-run / apply

**API (tenant acotado, solo dry-run):**

```http
POST /api/saas/deals/etl
{ "mode": "dry-run" }
```

`apply` vía API devuelve **403** — evita ETL global desde el producto.

**CLI ops (global, dry-run o apply):**

```powershell
cd apps/web
pnpm saas:deals-etl -- --dry-run
pnpm saas:deals-etl -- --apply --i-understand-apply
```

`apply` en CLI **requiere** `--i-understand-apply` explícito.

Script SQL de referencia (solo lectura): `backend/db/scripts/saas_deals_etl_preview.sql`

## Aislamiento tenant

- Todas las queries filtran `tenant_id`
- RLS en Postgres (`313_saas_deals_rls.sql`) complementa la app
- Tests: `saasDealsTenantIsolation.test.ts`, `saasDeals.test.ts`

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Migración 312/313 no en prod | `pnpm migrate` manual (Railway no auto-migra) |
| Deals sin contacto tras ETL | `skippedNoContact` en reporte; revisar ETL contactos primero |
| Duplicado con `saas_contacts.pipeline_stage` | Deals es fuente pipeline Fase 3+; contacto mantiene stage legacy hasta UI unificada |
| Forecast simplificado | probability por deal; no histórico de etapas |

## Siguiente paso (UI — Fase 3B)

1. Vista kanban `/saas/crm` consumiendo `/api/saas/deals` (no `crm/pipeline` basado en contactos)
2. Detalle contacto mostrando `dealsContext`
3. Deprecar lectura pipeline desde `saas_contacts` agregado cuando deals tenga datos

## Validación local

```powershell
cd apps/web
pnpm exec vitest run ../../backend/saas/__tests__/saasDeals.test.ts ../../backend/saas/__tests__/saasDealsTenantIsolation.test.ts ../../backend/saas/__tests__/saasDealsDedupe.test.ts
pnpm typecheck
$env:NODE_OPTIONS="--max-old-space-size=8192"; pnpm build
```

## Validación prod (tras migrate)

```powershell
cd apps/web
$env:DATABASE_URL="postgresql://..."
pnpm migrate:prod
pnpm validate:saas-deals-migrations
```
