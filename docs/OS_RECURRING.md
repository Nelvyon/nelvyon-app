# OS Recurring Services — Servicios Continuos Mensuales

Nelvyon OS genera automáticamente entregables mensuales para cada tenant con al menos un pack completado. Esto ocurre el día 1 de cada mes vía cron job.

---

## Servicios generados por mes

| Servicio | `service_type` | Descripción |
|---|---|---|
| Informe SEO | `seo_report` | Resumen posicionamiento, keywords, oportunidades y próximos pasos |
| Calendario social | `social_calendar` | 4 semanas × 3 posts (Instagram, LinkedIn, Stories) con copies y hashtags |
| Snapshot campañas | `ads_snapshot` | Estado Meta Ads + Google Ads, recomendaciones de activación |

---

## Arquitectura

```
Railway Cron (1º de cada mes, 08:00 UTC)
  → GET /api/cron/os-recurring-services?month=YYYY-MM
      → nelvyon_pack_runs (status='completed') → tenant_ids
      → OsRecurringServicesService.generateMonthlyDeliverables(tenantId, month)
          → INSERT saas_recurring_deliverables (ON CONFLICT DO NOTHING)
```

### Idempotencia
El cron usa `ON CONFLICT (tenant_id, month, service_type) DO NOTHING`, por lo que re-ejecuciones son seguras y no duplican datos.

---

## Tabla: `saas_recurring_deliverables`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | TEXT | Identificador del tenant SaaS |
| `month` | TEXT | Mes en formato `YYYY-MM` |
| `service_type` | TEXT | `seo_report` \| `social_calendar` \| `ads_snapshot` |
| `payload` | JSONB | Contenido del entregable (estructura varía por tipo) |
| `status` | TEXT | `generated` → `delivered` → `archived` |
| `created_at` | TIMESTAMPTZ | |

---

## Activación en Railway

1. Configurar cron en Railway:
   ```
   Schedule: 0 8 1 * *
   Command:  curl -s -H "x-cron-secret: $CRON_SECRET" \
               "$NEXT_PUBLIC_APP_URL/api/cron/os-recurring-services"
   ```

2. Variable requerida: `CRON_SECRET` (ya en producción)

3. Re-ejecutar manualmente para un mes concreto:
   ```
   GET /api/cron/os-recurring-services?month=2026-06
   Header: x-cron-secret: <CRON_SECRET>
   ```

---

## Uso programático

```typescript
import { getOsRecurringServicesService } from "@nelvyon/saas";

const svc = getOsRecurringServicesService();

// Generar entregables de junio para un tenant
const deliverables = await svc.generateMonthlyDeliverables("tenant-123", "2026-06");

// Listar entregables de un mes
const list = await svc.listDeliverables("tenant-123", "2026-06");

// Marcar como entregado
await svc.markDelivered("tenant-123", deliverableId);
```

---

## Tests

```bash
pnpm -C apps/web exec vitest run backend/saas/__tests__/OsRecurringServicesService.test.ts
# 12 tests — generateMonthlyDeliverables (8), listDeliverables (2), markDelivered (2)
```

---

## Próximos pasos (post-MVP)

- Conectar entregables al portal cliente (`/portal/recurring`)
- Enviar notificación email al tenant cuando los entregables estén listos
- Personalizar payload con datos reales del CRM (campañas activas, keywords del tenant)
- Soporte para entregables adicionales: email newsletter, lead scoring report
