# Fase 1C — Resumen y pendiente antes de OS

## Completado en 1C

1. **Métricas SaaS (contactos)** — Adapter `saas_contact_quota.py` usado en:
   - `dashboard_metrics.py` (totales + periodo + `contacts_source`)
   - `global_dashboard.py` (salud cuenta + modules-summary CRM)
   - `workspace_home.py`
   - `module_analytics.py` (totales; charts legacy documentados)

2. **Cuotas / billing** — `plan_quota` y `workspace_service` alineados en modo **hybrid**; doc en `PHASE_1C_QUOTAS.md`.

3. **Legacy marcado** — Comentarios en routers y UI (`PHASE_1C_LEGACY_DASHBOARDS.md`).

4. **Plan `saas_deals`** — `PHASE_1C_SAAS_DEALS_PLAN.md` (sin implementación).

## Pendiente antes de OS (orden sugerido)

| # | Tarea | Bloquea OS |
|---|--------|------------|
| 1 | ETL apply contactos por tenants productivos | Recomendado |
| 2 | Enforcement cuota en `POST /api/saas/crm/contacts` | Recomendado |
| 3 | `reporting_service` / `/api/crm/stats` → hybrid o deprecación | No |
| 4 | Implementar `saas_deals` + ETL deals | Sí (pipeline OS) |
| 5 | Redirigir KPIs deals en dashboards a hybrid | Tras #4 |
| 6 | Modo `saas_only` contactos (quitar GREATEST) | Tras #1 estable |
| 7 | Unificar auth `tenantId` / bridge en todos los agents | Sí |
| 8 | OS `CrmService.ts` solo lectura `saas_*` | Tras #4–#7 |

## No hacer todavía

- Módulo OS / agentes operativos nuevos
- Tabla `saas_deals` ni migración SQL
- Rediseño dashboards / marketing / web pública
- Eliminar `/dashboard/crm` ni tablas legacy

## Validación 1C

```bash
cd backend && python -m pytest tests/test_phase1c_saas_contact_metrics.py tests/test_dashboard_hardening.py tests/test_remediation_master_phase3_billing.py tests/test_tenant_require_workspace.py -q
cd backend/saas && npm test -- --testPathPattern="saasTenantBridge|saasCrm|crmConsolidation"
```

Typecheck/build según scripts del monorepo (`pnpm`, `tsc` en apps que apliquen).
