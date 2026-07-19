# Fase 2F — OS listo para volver al SaaS

## 1. Partes de OS completas

| Módulo | Ruta | Estado |
|--------|------|--------|
| Shell y navegación | `/os/*` | Completo |
| Clientes internos | `/os/clientes` | CRUD `nelvyon_clients` |
| Proyectos | `/os/proyectos` | CRUD `nelvyon_projects` |
| Pipeline | `/os/pipeline` | CRUD `os_deals` (migración 281) |
| Tareas | `/os/tareas` | CRUD `os_tasks` |
| Documentos | `/os/documentos` | Outputs, assets, contratos, facturas |
| Finanzas | `/os/finanzas` | Ingresos (invoices), gastos (`os_expenses`), flujo (`os_cashflow` + cálculo), contratos, billing |
| Dashboard ejecutivo | `/os/dashboard` | KPIs operativos + financieros + actividad reciente |
| IA operativa | `/os/ia` | Resúmenes, bloqueos y tareas sugeridas desde datos reales |
| Assignee | Formularios pipeline/tareas | Texto libre + datalist miembros workspace |

## 2. Partes pendientes en OS

| Área | Nota |
|------|------|
| Migraciones prod | `281` y `282` — ejecutar `pnpm migrate` manual en Railway |
| Assignee → `user_id` | Propuesta documentada; no implementado (no romper datos) |
| P&L / informes export | Sin PDF/CSV unificado |
| Cashflow inflows desde facturas | Ingresos calculados en UI; ledger `os_cashflow` solo salidas gasto + manual |
| Permisos OS granulares | Matriz global; sin ABAC por registro |
| Onboarding OS | Sin wizard primer uso |

## 3. Qué puede reutilizar SaaS (Fase 3)

| Pieza OS | Reutilización SaaS |
|----------|-------------------|
| Patrón entidades `/api/v1/entities/*` | `saas_deals`, `saas_tasks` espejo |
| `WorkspaceAwareMixin` | Todos los módulos tenant |
| Finanzas invoices | Facturación cliente final del tenant |
| Pipeline estados | Plantilla universal configurable |
| Dashboard KPIs | Materializar en `saas_dashboard_metrics` |
| IA insights (`buildOsIaInsights`) | Adaptar a `saas_contacts` / proyectos tenant |
| Documentos unificados | Misma vista sobre `nelvyon_outputs` del tenant |

## 4. Qué falta para Fase 3 SaaS

1. **`saas_deals`** — migración + API + UI (sin tocar hasta backend listo).
2. **ETL contactos** — lectura única `saas_contacts`; deprecar listados `crm_*` en UI.
3. **Bridge tenant** — `saas_tenants` ↔ `workspaces` documentado y probado en prod.
4. **CRM UI** — reactivar rutas SaaS solo cuando deals + contactos estén unificados.
5. **Migraciones 281 + 282** en producción antes de métricas OS en tenants reales.

## Assignee — mejora propuesta (sin ruptura)

| Hoy | Propuesta Fase 3 |
|-----|------------------|
| `assignee` VARCHAR texto | Mantener columna; añadir `assignee_user_id` INTEGER nullable FK opcional |
| Sin validación | UI `OsAssigneeInput` ya sugiere emails de `/api/v1/workspace/members` |
| Roles OS globales | Mapear `workspace_members.role` a permisos por módulo SaaS |

No eliminar `assignee` texto hasta migración de datos explícita.

## Validación técnica Fase 2F

- Migración: `backend/db/migrations/282_os_expenses_cashflow.sql`
- API: `/api/v1/entities/os_expenses`, `/api/v1/entities/os_cashflow`
- Tests: `finanzas/__tests__/compute.test.ts`, `ia/__tests__/insights.test.ts`

## Próximo paso recomendado

**Fase 3 SaaS:** `saas_deals` + consolidación `saas_contacts`, con OS congelado salvo fixes. Ejecutar migraciones **281** y **282** en producción antes del despliegue SaaS.
