# Fase 3D — Pulido RBAC en UI + tests por rol

Extiende la Fase 3C con coherencia frontend/backend.

## UI de permisos

- Hook compartido: `useSaasPermissions()` — fetch único a `/api/saas/settings`
- Componentes: `SaasCan`, `SaasPermissionDenied`
- Helpers: `saasPermissions.ts` (`hasSaasPermission`, `saasRoleLabel`, `saasForbiddenMessage`)

## Acciones ocultas por rol

| Módulo | viewer | member | admin/owner |
|--------|--------|--------|-------------|
| CRM contactos | sin crear/editar/actividad | crear/editar | completo |
| Deals/pipeline | kanban solo lectura | sin eliminar | completo |
| Campañas | solo lista | sin crear/lanzar | completo |
| Workflows | solo lista | sin eliminar/ejecutar/activar | completo |
| Billing | nav oculto + 403 API | nav oculto + 403 | visible |
| Settings | rol visible + descripción | idem | idem |

## Rutas UI

- `/saas/settings` — badge de rol + texto explicativo por rol
- `/saas/billing` — mensaje claro en 403; badge de rol cuando hay acceso

## Tests

- `saasPermissions.test.ts` — helpers y nav por permisos
- `saasPermissionsUi.test.tsx` — viewer/member/admin en `SaasCan` y `DealDetailPanel`
- `saasRbacApi.test.ts` — 403 API viewer/member; owner DELETE OK

## Validación

```powershell
cd apps/web
pnpm exec vitest run src/features/saas-shell backend/saas/__tests__/saasRbacApi.test.ts backend/saas/__tests__/saasRbac.test.ts
pnpm typecheck
$env:NODE_OPTIONS="--max-old-space-size=8192"; pnpm build
```
