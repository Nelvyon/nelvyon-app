# Fase 1C — Cuotas y billing (contactos SaaS)

## Modo transitorio (activo)

| Modo | Función | Comportamiento |
|------|---------|----------------|
| **hybrid** (default) | `count_contacts_for_workspace(..., mode="hybrid")` | `max(saas_contacts⋈tenant, crm_contacts + contacts)` |
| **saas_only** (futuro) | `mode="saas_only"` | Solo `saas_contacts` vía `saas_tenants.workspace_id` |

Implementación: `backend/services/saas_contact_quota.py`

## Consumidores unificados (Fase 1C)

| Consumidor | Estado |
|------------|--------|
| `plan_quota.count_contacts_in_workspace` | hybrid |
| `workspace_service._count_resource("contacts")` | hybrid (delega en quota) |
| `billing_usage` | hybrid (vía plan_quota) |
| `enforce_contact_*` | hybrid |
| Jobs `nelvyon_workspace_crm_snapshot` | hybrid (vía plan_quota) |

## Pasar a saas-only

1. ETL apply completado por tenant (`SaasCrmEtlService`).
2. Validar `legacyCrmGuard` sin escrituras nuevas en legacy.
3. Confirmar `count_saas >= count_legacy` en auditoría.
4. Cambiar en un solo sitio:

```python
# plan_quota.py — count_contacts_in_workspace
return await count_contacts_for_workspace(db, workspace_id, mode="saas_only")
```

5. Métricas/dashboards: mismo `mode="saas_only"` en routers que llaman al adapter.
6. Eliminar SQL `CONTACTS_QUOTA_COUNT_SQL` / GREATEST cuando no queden filas legacy.

## Enforcement SaaS CRM

`POST /api/saas/crm/contacts` aún no llama a `enforce_contact_create_quota` (Node). Añadir en fase posterior usando el mismo conteo hybrid vía FastAPI o SQL duplicado en TS.

## Referencias

- Fase 1B: `PHASE_1B_QUOTAS.md`
- Bridge: `PHASE_1A_TENANT_BRIDGE.md`
