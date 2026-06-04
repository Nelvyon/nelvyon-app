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

| Ubicación | Qué cuenta | Acción 1B |
|-----------|------------|-----------|
| `workspace_service.py` | contacts (híbrido) | Actualizado |
| `dashboard_metrics.py` | ORM `Contacts` | Legacy — documentado |
| `global_dashboard.py` | SQL `contacts` | Legacy — documentado |
| `module_analytics.py` | ORM `Contacts` | Legacy — documentado |
| `reporting_service.py` | `crm_contacts` | Legacy — fase 1C |
| `admin/*` | `saas_contacts` | OK |

## Adapter SQL reutilizable

`backend/services/saas_contact_quota.py`:

- `CONTACTS_QUOTA_COUNT_SQL` — transición GREATEST
- `CONTACTS_QUOTA_SAAS_ONLY_SQL` — post-migración completa

## Deals

Sin cambios en Fase 1B (`deals`, `crm_deals`, `pipeline_deals` siguen legacy).
