# Fase 3E — Workflows y campañas conectadas a deals

Pipeline oficial: `saas_deals`. Los contactos mantienen `pipeline_stage` sincronizado (Fase 3B) pero workflows y campañas pueden apuntar directamente a deals.

## Workflows

### Trigger `deal_stage_changed`
- Se dispara automáticamente en `SaasDealsService.changeStage` cuando la etapa cambia.
- `trigger_config` opcional: `stage_to`, `stage_from`, `contact_id`.
- Compatibilidad: `stage_changed` sigue siendo cambio de etapa de **contacto**.

### Condiciones (deal)
- `deal.stage`, `deal.value`, `deal.contact_id`, `deal.probability`
- Condiciones de contacto sin cambios.

### Acciones (deal)
| Acción | Descripción |
|--------|-------------|
| `change_deal_stage` | Mueve deal (usa `updateDeal`, no re-dispara trigger) |
| `add_deal_note` | Añade nota al deal |
| `create_deal_activity` | Actividad CRM en contacto del deal con prefijo `[Deal id]` |

Archivos: `SaasWorkflowService.ts`, `saasWorkflowDispatch.ts`, migración `314_saas_workflows_deal_trigger.sql`.

## Campañas

### Audiencia por deal
| Filtro | Comportamiento |
|--------|----------------|
| `deal_stage` | Contactos con deal en esa etapa (`JOIN saas_deals`) |
| `deal_open_only` | Contactos con deal abierto (no won/lost) |
| `pipeline_stage` | Legacy — columna contacto (deprecated en UI) |

## UI mínima
- Workflows: trigger «Cambio etapa oportunidad» (`deal_stage_changed`).
- Campañas: modos «Etapa de oportunidad» y «Pipeline abierto (deals)».

## Seguridad
- Queries filtran por `tenant_id` en contacts y deals.
- RBAC sin cambios (Fase 3C/3D).
- Sin tablas legacy.

## Tests
- `saasWorkflowsDeal.test.ts` — dispatch, condiciones, acciones, hook changeStage
- `saasCampaniasDealAudience.test.ts` — audiencia deal_stage, open, tenant isolation

## Validación

```powershell
cd apps/web
pnpm exec vitest run backend/saas/__tests__/saasWorkflowsDeal.test.ts backend/saas/__tests__/saasCampaniasDealAudience.test.ts backend/saas/__tests__/saasWorkflows.test.ts backend/saas/__tests__/saasCampanias.test.ts
pnpm typecheck
$env:NODE_OPTIONS="--max-old-space-size=8192"; pnpm build
```
