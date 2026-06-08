# AUTONOMOUS Phase M — Real Learning Loop

Cierra el loop de aprendizaje conectando **outcomes reales** (portal + pipeline) con **rankings automáticos** (job/cron), sin tocar SaaS core, OS core crítico ni web pública.

## Resumen

| Componente | Rol |
|------------|-----|
| `template_outcomes` (Postgres) o `local-outcomes.json` | Fuente de verdad de resultados |
| Portal approve/reject | Escribe outcome `client_approved` / `client_rejected` |
| `autonomous:rank-templates` | Recalcula `rankings.json` + `learningReport.json` |
| GA4 placeholder | `conversion_rate` / `lead_count` opcionales, `null` sin API |

**Autonomía:** 74% → **78%** (+4%)

---

## 1. Activar DB learning (staging)

```bash
export ENABLE_TEMPLATE_LEARNING_DB=true
export DATABASE_URL="postgresql://..."
pnpm -C apps/web migrate   # incluye 323_template_outcomes.sql
```

Sin flag → **fallback local** en `backend/autonomous/output/learning/local-outcomes.json` (nunca rompe producción).

| Variable | Default | Efecto |
|----------|---------|--------|
| `ENABLE_TEMPLATE_LEARNING_DB` | `false` | `true` + `DATABASE_URL` → Postgres |
| `DATABASE_URL` | — | Requerido solo con flag DB |
| `GA4_PROPERTY_ID` | — | Placeholder; métricas siguen `null` |
| `AUTONOMOUS_LEARNING_RANKINGS_PATH` | `output/learning/rankings.json` | Override path rankings |

**Producción real:** NO activar `ENABLE_TEMPLATE_LEARNING_DB` sin revisión ops.

---

## 2. Correr rankings (cron / job)

```bash
pnpm -C apps/web autonomous:rank-templates
```

El job:

1. Lee outcomes desde DB (`ENABLE_TEMPLATE_LEARNING_DB=true`) o `local-outcomes.json`
2. Ejecuta `rankTemplates` / `rankTemplatesFromDb` por slice
3. Escribe:
   - `backend/autonomous/output/learning/rankings.json`
   - `backend/autonomous/output/learning/learningReport.json`

**Cron sugerido (staging):** cada 6h o tras batch de entregas autónomas.

```cron
0 */6 * * * cd /app && pnpm -C apps/web autonomous:rank-templates >> /var/log/autonomous-rank.log 2>&1
```

El pipeline Phase C/H ya consume `rankings.json` vía `pipelineTemplateSelector` (Phase L).

---

## 3. Portal alimenta outcomes

Cuando un entregable tiene `deliverable_metadata.autonomous_provenance === true`:

| Evento portal | Outcome |
|---------------|---------|
| Cliente **aprueba** | `approved_by_client=true`, `result_status=client_approved` |
| Cliente **rechaza** | `approved_by_client=false`, `revisions_count≥1`, `result_status=client_rejected` |

**Hook aislado** (side-effect, no altera flujo de aprobación):

- `backend/services/portal_deliverable_review_service.py` → `maybe_record_portal_outcome`
- `backend/services/autonomous_portal_learning_service.py`

Requisitos en metadata (desde publish autónomo Phase D/G):

```json
{
  "autonomous_provenance": true,
  "template_id": "landing-cro-v3",
  "sector": "restaurant",
  "sku": "landing",
  "qa_score": 88,
  "autonomous_project_id": "..."
}
```

Entregables **sin** `autonomous_provenance` → **no** crean outcome.

---

## 4. GA4 / conversión (placeholder)

Archivo: `backend/autonomous/portal/conversionMetricsPlaceholder.ts`

- `conversion_rate`: opcional, `null` por defecto
- `lead_count`: opcional, `null` por defecto
- Sin `GA4_PROPERTY_ID` → `source: "none"`
- Con `GA4_PROPERTY_ID` → estructura lista (`source: "ga4"`) pero **sin llamada API real**

Próximo paso (Phase N+): conectar GA4 Data API o webhook de leads con rate limiting y PII-safe aggregation.

---

## 5. Cómo no romper producción

1. **Flags off por defecto** — learning DB y GA4 desactivados
2. **Hooks try/except** — fallos de learning solo loguean warning
3. **Sin cambios en rutas portal** — mismos endpoints approve/reject
4. **Tabla aislada** — `template_outcomes` sin RLS, no expuesta en API pública
5. **Output gitignored** — `backend/autonomous/output/`

---

## 6. Comandos

| Comando | Fase |
|---------|------|
| `pnpm -C apps/web autonomous:learning` | K — mock + Phase H/I merge |
| `pnpm -C apps/web autonomous:rank-templates` | **M — rankings DB/local** |
| `pnpm -C apps/web autonomous:phase-c` | Pipeline con selector L |
| `pnpm -C apps/web autonomous:phase-h` | QA + `recordPostQaOutcome` |

---

## 7. Tests

```bash
pnpm -C apps/web test -- backend/autonomous/__tests__/phaseM.test.ts
pytest backend/tests/test_autonomous_portal_learning.py -q
```

Cubre: job DB/local, approve/reject portal, no autónomo, sin DB, `rankings.json` actualizado.

---

## 8. Staging checklist

1. Migrar `323_template_outcomes.sql`
2. `ENABLE_TEMPLATE_LEARNING_DB=true` en staging only
3. Publicar entregable autónomo con `autonomous_provenance`
4. Aprobar/rechazar en portal → verificar fila en `template_outcomes` o `local-outcomes.json`
5. `pnpm -C apps/web autonomous:rank-templates`
6. Verificar `rankings.json` y siguiente run Phase C usa plantilla actualizada

---

## 9. Siguiente paso recomendado

**Phase N — GA4 real + conversion scoring**

- Integrar GA4 Data API (read-only, service account staging)
- Poblar `conversion_rate` / `lead_count` en outcomes post-publicación
- Peso `conversion_score` en ranking con ventana 30d
- Dashboard interno de learning (sin web pública)
