# Fase 1A — Transición CRM (saas_contacts oficial)

## Fuente oficial SaaS

| Capa | Artefacto |
|------|-----------|
| Tabla | `saas_contacts` |
| Servicio | `SaasCrmService` |
| API | `/api/saas/crm/*` |
| UI | `/saas/crm` |

Definido en código: `backend/saas/crmConsolidation.ts`

## Legacy — escrituras congeladas (no borrar tablas)

| Store | Tabla | Aislamiento | Archivos principales |
|-------|-------|-------------|----------------------|
| `contacts` | `contacts` | `workspace_id` | `services/contacts.py`, `routers/contacts.py`, `campaign_service.py` |
| `crm_contacts_workspace` | `crm_contacts` | `workspace_id` | `services/crm_service.py`, `routers/crm.py` |
| `crm_contacts_os` | `crm_contacts` | `user_id` | `os-agents/crm/CrmService.ts`, `pages/api/os/crm/contacts.ts` |

Lista congelada: `FROZEN_LEGACY_CRM_WRITE_PATHS` en `crmConsolidation.ts`.  
**No añadir nuevos writers** sin actualizar la lista y `crmConsolidation.test.ts`.

## UI / API legacy (solo lectura o mantenimiento)

- `apps/web` `/dashboard/crm` → FastAPI `/api/crm/*` → `crm_contacts`
- `frontend` Vite CRM tabs → entidades legacy

## Próximos pasos (no Fase 1A)

1. ETL `contacts` + `crm_contacts` → `saas_contacts` (con dedupe por email + tenant).
2. Redirigir cuotas (`workspace_service`) a contar solo `saas_contacts`.
3. Deprecar escrituras legacy tras periodo dual-read.

## Seguridad

- `SaasCrmService.updateContact`: ya no consulta por `id` sin `tenant_id` (evita enumeración cross-tenant).
- RLS en `saas_contacts` (migración 311).
