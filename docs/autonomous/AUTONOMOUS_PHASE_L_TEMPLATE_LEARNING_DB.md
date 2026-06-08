# NELVYON Autonomous — Phase L: Template Learning DB & Pipeline Selector

**Versión:** 1.0  
**Fecha:** 2026-06-08  
**Estado:** Implementado (aislado) — migración + repo + wire Phase C/H  
**Sin tocar:** SaaS · OS core crítico · Portal · Web pública · prod sin flag

---

## 1. Objetivo

Persistir outcomes del Learning Engine y **usar el selector de plantillas** en pipelines autónomos Phase C/H, con reintentos por plantilla alternativa si QA < 85.

---

## 2. Migración `323_template_outcomes.sql`

Tabla `template_outcomes` con campos:

| Campo | Tipo |
|-------|------|
| `id` | UUID PK |
| `workspace_id` | INTEGER nullable |
| `template_id` | TEXT NOT NULL |
| `category` | TEXT NOT NULL |
| `sector` | TEXT NOT NULL |
| `service` | TEXT NOT NULL |
| `objective`, `channel`, `language`, `level` | TEXT |
| `qa_score` | NUMERIC |
| `approved_by_client` | BOOLEAN |
| `revisions_count` | INTEGER DEFAULT 0 |
| `conversion_rate`, `lead_count`, `client_rating`, `delivery_time_hours` | NUMERIC/INTEGER |
| `result_status`, `notes` | TEXT |
| `metadata` | JSONB |
| `created_at` | TIMESTAMPTZ |

**Índices:** `template_id`, `sector`, `service`, `category`, `created_at`, compuesto `(sector, service, category, created_at DESC)`.

**Sin RLS** en Phase L — tabla no expuesta por API pública.

Aplicar:

```bash
cd apps/web
$env:DATABASE_URL="postgresql://..."
pnpm migrate:prod
```

---

## 3. Qué se persiste

Cada paso QA autónomo (Phase C/H) genera un outcome con:

- Plantilla seleccionada (`template_id`)
- Sector, servicio, categoría
- `qa_score`, `revisions_count` (= retry_count)
- `result_status`: `qa_passed` / `qa_failed` / `published_internal`
- `metadata`: `project_ref`, `sku`, `template_pipeline`, fase

---

## 4. Cuándo se guarda

| Evento | Acción |
|--------|--------|
| Post-QA Phase C | `recordPostQaOutcome()` tras cada intento |
| Post-QA Phase H | `recordPostQaOutcome()` tras QA combinado offline + Playwright |
| Phase I | Hereda Phase H (mismo outcome path) |

**Modos de almacenamiento:**

| Condición | Modo |
|-----------|------|
| `ENABLE_TEMPLATE_LEARNING_DB=true` + `DATABASE_URL` | **Postgres** `template_outcomes` |
| Solo `DATABASE_URL` (sin flag) | **Local JSON** `output/learning/local-outcomes.json` |
| Sin `DATABASE_URL` | **Local JSON** (nunca falla) |
| Siempre | Snapshot JSON `output/learning/pipeline-outcomes/{project_id}.json` |

---

## 5. Flags

| Variable | Default | Efecto |
|----------|---------|--------|
| `ENABLE_TEMPLATE_LEARNING_DB` | `false` | `true` + `DATABASE_URL` → INSERT en Postgres |
| `DATABASE_URL` | — | Requerido solo para modo DB |
| `AUTONOMOUS_LEARNING_RANKINGS_PATH` | `output/learning/rankings.json` | Override path rankings |

**Producción real:** NO activar `ENABLE_TEMPLATE_LEARNING_DB` sin revisión ops.

---

## 6. Selector en pipeline (Phase C/H)

Flujo:

```
pickPipelineTemplate(sector, service)
    │
    ├─ 1) rankings.json si existe
    ├─ 2) rank desde registry + outcomes local/DB
    └─ 3) default sectorial (landing-cro-v3, etc.)
    │
    ▼
final_template_score < 65 → saltar, probar alternativa
    │
    ▼
inject template_id en plan + strategist
    │
    ▼
QA < 85 → retry (máx 3) con siguiente plantilla no usada
```

`retryHistory.json` incluye `template_id`, `final_template_score`, `template_source`.

---

## 7. Cómo ejecutar local

```bash
# 1. Generar rankings (Phase K)
pnpm -C apps/web autonomous:learning

# 2. Phase C con selector
pnpm -C apps/web autonomous:phase-c

# 3. Phase H con post-QA record
pnpm -C apps/web autonomous:phase-h

# 4. Tests Phase L
pnpm -C apps/web exec vitest run ../../backend/autonomous/__tests__/phaseL.test.ts
```

### Activar persistencia DB (staging)

```bash
export DATABASE_URL=postgresql://...
export ENABLE_TEMPLATE_LEARNING_DB=true
pnpm migrate:prod
pnpm -C apps/web autonomous:phase-h
```

Verificar:

```sql
SELECT template_id, sector, qa_score, result_status, created_at
FROM template_outcomes
ORDER BY created_at DESC
LIMIT 10;
```

---

## 8. Archivos clave

| Archivo | Rol |
|---------|-----|
| `backend/db/migrations/323_template_outcomes.sql` | Schema |
| `backend/autonomous/templates/templateOutcomeRepository.ts` | Persistencia |
| `backend/autonomous/templates/pipelineTemplateSelector.ts` | Selector pipeline |
| `backend/autonomous/templates/recordPostQaOutcome.ts` | Wire post-QA |
| `backend/autonomous/simulatorPhaseC.ts` | Retry + template |
| `backend/autonomous/pilots/restaurantLandingPhaseH.ts` | Wire Phase H |

---

## 9. Conexión futura OS

| Fase | Integración |
|------|-------------|
| **M** | Portal approve/reject → `approved_by_client` |
| **N** | Cron nightly `rankTemplatesFromDb` → refresh rankings |
| **O** | OS panel interno lee rankings (read-only) |

---

## 10. Qué NO hace todavía

- RLS en `template_outcomes`
- API HTTP pública
- CR/conversión live desde GA4
- Auto-publish OS (sigue `dry_run`)
- Learning LLM patterns (`agent_learnings`)

---

## 11. Autonomía

| Fase | % |
|------|---|
| Post I | 62% |
| K (ranking JSON) | 69% |
| **L (DB + pipeline selector)** | **74%** |

---

## 12. Referencias

- `AUTONOMOUS_PHASE_K_LEARNING_ENGINE.md`
- `LEARNING_ENGINE_ROADMAP.md`
- `TEMPLATE_FACTORY_ROADMAP.md`
