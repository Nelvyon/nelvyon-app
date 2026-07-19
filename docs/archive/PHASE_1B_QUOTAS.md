# Fase 1B — Cuotas y métricas (contactos)

## Conteo actualizado (billing / plan quota)

`backend/services/workspace_service.py` — recurso `contacts`:

```sql
GREATEST(
  COUNT(saas_contacts JOIN saas_tenants ON workspace_id),
  COUNT(crm_contacts) + COUNT(contacts)
)
```

Evita bajar cuotas de golpe mientras coexisten datos legacy y SaaS.

## Código que aún cuenta legacy directamente

| Ubicación | Qué cuenta | Acción |
|-----------|------------|--------|
| `workspace_service.py` | contacts (híbrido) | 1B/1C ✅ |
| `plan_quota.py` / `billing_usage` | hybrid vía adapter | 1C ✅ |
| `dashboard_metrics.py` | hybrid contactos | 1C ✅ |
| `global_dashboard.py` | hybrid contactos | 1C ✅ |
| `module_analytics.py` | hybrid totales; charts legacy | 1C ✅ |
| `reporting_service.py` | `crm_contacts` | Pendiente |
| `admin/*` | `saas_contacts` | OK |

Ver `PHASE_1C_QUOTAS.md` para modo saas-only.

## Adapter SQL reutilizable

`backend/services/saas_contact_quota.py`:

- `CONTACTS_QUOTA_COUNT_SQL` — transición GREATEST
- `CONTACTS_QUOTA_SAAS_ONLY_SQL` — post-migración completa

## Deals

Sin cambios en Fase 1B (`deals`, `crm_deals`, `pipeline_deals` siguen legacy).
