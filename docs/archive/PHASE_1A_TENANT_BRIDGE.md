# Fase 1A — Tenant bridge (workspace ↔ SaaS)

## Problema

Dos mundos de aislamiento convivían sin mapeo persistente:

| Mundo | Identificador | Uso |
|-------|---------------|-----|
| Legacy FastAPI | `workspace_id` INTEGER | `contacts`, `crm_contacts`, `require_workspace`, cuotas |
| SaaS TypeScript | `saas_tenants.id` UUID | `saas_contacts`, `/api/saas/*`, campañas, workflows |

## Solución implementada

### 1. Mapeo oficial

Columna **`saas_tenants.workspace_id`** (INTEGER, UNIQUE, nullable).

- **1:1** entre tenant SaaS y workspace legacy cuando existe vínculo.
- Backfill: workspace primario del usuario (`MIN(workspaces.id)` donde `workspaces.user_id = saas_tenants.user_id::text`).

### 2. Estrategia de compatibilidad

| Operación | Comportamiento |
|-----------|----------------|
| Alta de tenant (`createTenant`) | Tras insert, `linkPrimaryWorkspace` si hay workspace |
| Fin onboarding (`completeOnboarding`) | Mismo bridge automático |
| Lectura FastAPI con `X-Workspace-Id` | `SaasTenantBridgeService.getTenantByWorkspaceId(wsId)` |
| Lectura SaaS con JWT | `SaasOnboardingService.getTenant(userId)` → incluye `workspaceId` |
| Auth JWT `tenantId` (TEXT) | Sigue siendo claim de `nelvyon_users`; **no** sustituye a `saas_tenants.id` |

### 3. API de servicio

`backend/saas/SaasTenantBridgeService.ts`:

- `getTenantByWorkspaceId(workspaceId)`
- `getWorkspaceIdForTenant(tenantId)`
- `linkPrimaryWorkspace(userId, saasTenantId)`
- `linkWorkspace(userId, saasTenantId, workspaceId)`

### 4. Migración

- `310_saas_tenant_workspace_bridge.sql` — columna + índice + backfill.
- `311_saas_tenant_rls.sql` — RLS en tablas `saas_*` por `nelvyon_current_saas_tenant_uuid()`.

### 5. Riesgos residuales

- Usuario sin fila en `workspaces` → `workspace_id` NULL hasta crear workspace.
- Varios workspaces por usuario → solo el de **menor id** se vincula automáticamente; otros requieren `linkWorkspace` explícito.
- `DbClient` (service_role) sigue omitiendo RLS: obligatorio filtrar `tenant_id` en código.

### 6. Tests

`backend/saas/__tests__/saasTenantBridge.test.ts`
