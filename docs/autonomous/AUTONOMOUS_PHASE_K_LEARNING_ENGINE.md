# NELVYON Autonomous — Phase K: Learning Engine

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Estado:** Implementado (capa aislada) — **sin DB, sin OS, sin SaaS, sin prod**

---

## 1. Objetivo

Primera versión **real** del Learning Engine: NELVYON aprende de cada plantilla, sector, servicio y resultado para **rankear y seleccionar** automáticamente la mejor plantilla.

Todo vive en `backend/autonomous/` — filesystem + JSON. **No escribe en Postgres.**

---

## 2. Arquitectura

```
fixtures/learning-outcomes-mock.json ──┐
output/phase-h/restaurant-landing/  ──┼──► learningEvents.ts
output/phase-i/restaurant-landing/    ──┘         │
                                                ▼
templates/registry.json ──────────────► runLearningEngine.ts
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    ▼                           ▼                           ▼
            templateRanking.ts          templateSelector.ts          output/learning/
```

| Módulo | Rol |
|--------|-----|
| `templateOutcome.ts` | Modelo + validación + agregados |
| `templateRanking.ts` | 4 scores + `final_template_score` |
| `templateSelector.ts` | Mejor plantilla por slice |
| `learningEvents.ts` | Ingesta Phase H/I (aislada) |
| `registry.json` | Catálogo 11 plantillas seed |
| `runLearningEngine.ts` | Orquestador + escritura JSON |

---

## 3. Template Outcome Model

Cada resultado registrado incluye:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `template_id` | string | ID plantilla registry |
| `category` | enum | landing, website, ecommerce, chatbot, ads, branding |
| `sector` | string | dental, restaurant, … |
| `service` | string | landing, google_ads, … |
| `objective` | string | lead_gen, booking, … |
| `channel` | string | web, meta_feed, … |
| `language` | string | es, en, … |
| `level` | string | starter, professional, … |
| `qa_score` | 0–100 | Score QA combinado |
| `approved_by_client` | bool | Aprobación cliente |
| `revisions_count` | int | Rondas revisión |
| `conversion_rate` | 0–100 \| null | CR medido |
| `lead_count` | int | Leads generados |
| `client_rating` | 1–5 \| null | Valoración cliente |
| `delivery_time_hours` | float | Horas entrega |
| `result_status` | enum | qa_passed, client_approved, client_rejected, … |
| `notes` | string? | Observaciones |

---

## 4. Ranking Engine

Por cada `template_id` en un slice:

| Score | Peso en final | Reglas |
|-------|---------------|--------|
| `quality_score` | 28% | QA alto premia; std alto penaliza |
| `conversion_score` | 27% | CR real o benchmark sector |
| `usage_score` | 22% | Aprobación cliente, pocas revisiones |
| `reliability_score` | 23% | Penaliza rechazos y revisiones altas |
| **`final_template_score`** | — | Suma ponderada − 5 si cold-start (n < 3) |

**Penalizaciones:**
- `revisions_avg × 8` (máx 40) en reliability
- `reject_rate × 35%` en reliability
- Cold-start: blend con `baseline_scores` del registry

**Premios:**
- QA ≥ 85 sin rechazos → +5 reliability
- Alta `approval_rate` → usage_score alto
- CR medido → conversion_score dominante

---

## 5. Learning Events (Phase H/I)

Eventos capturados sin tocar OS:

| Evento | Fuente |
|--------|--------|
| `landing_generated` | `previewMetadata.json` |
| `preview_generated` | `preview.html` / Phase I deploy |
| `qa_completed` | `qaReport.json` |
| `os_publish_dry_run` | `osPublishPayload.json` (`dry_run: true`) |
| `client_approved` / `client_rejected` | Futuro webhook — API `applyClientEvent()` lista |

---

## 6. Cómo ejecutar

```bash
# Learning Engine completo
pnpm -C apps/web autonomous:learning

# Tests Phase K
pnpm -C apps/web exec vitest run ../../backend/autonomous/__tests__/phaseK.test.ts
```

### Output generado

Directorio: `backend/autonomous/output/learning/`

| Archivo | Contenido |
|---------|-----------|
| `rankings.json` | Rankings por slice |
| `selections.json` | Mejor plantilla por sector/servicio |
| `learningReport.json` | Resumen + autonomía % |
| `learningEvents.json` | Eventos Phase H/I ingeridos |
| `outcomesMerged.json` | Mock + Phase H/I merged |

---

## 7. Ejemplo salida CLI

```
=== NELVYON Phase K — Learning Engine ===
Registry:       v1.0.0
Outcomes:       16 (mock + Phase H/I)
Events:         5
Ranked slices:  28
Autonomía:      62% → 69% (+7)
Best restaurant/landing: landing-cro-v3 (score ~82)
Output:         backend/autonomous/output/learning/
```

---

## 8. Conexión futura a OS (no implementado)

| Fase | Integración |
|------|-------------|
| **L** | Migración `template_outcomes` — misma forma que modelo TS |
| **M** | Hook post-QA en autonomous job → `recordOutcome` |
| **N** | Portal approve/reject → `client_approved` event |
| **O** | OS selector consulta `rankings.json` o API interna |

**Principio:** OS solo **lee** ranking; nunca escribe outcomes desde portal en Phase K.

---

## 9. Datos necesarios

| Fuente | Obligatorio | Uso |
|--------|-------------|-----|
| `registry.json` | Sí | Catálogo + baselines |
| `learning-outcomes-mock.json` | Sí (dev) | Simulación histórica |
| Phase H `qaReport.json` | Opcional | QA real piloto |
| Phase I `deploy_metadata.json` | Opcional | Staging event |
| GA4 / CR cliente | Futuro | `conversion_rate` live |

---

## 10. Qué NO hace todavía

| Limitación | Phase futura |
|------------|--------------|
| Persistencia Postgres | L |
| Cron nightly recompute | M |
| UI ranking en OS | O |
| OAuth / ads CR | N |
| Escritura `agent_learnings` LLM | M |
| Auto-retry con plantilla alternativa | L |

---

## 11. Autonomía actualizada

| Métrica | Antes (post I) | Después (K) |
|---------|----------------|-------------|
| Pipeline autónomo | 62% | **69%** |
| Template selection | Manual | **Automático local** |
| Learning loop | No | **Sí (JSON)** |

El +7% refleja: ranking operativo, selector por sector, ingest Phase H/I, sin depender de DB prod.

---

## 12. Referencias

- `docs/autonomous/LEARNING_ENGINE_ROADMAP.md` — diseño Phase J
- `docs/autonomous/TEMPLATE_FACTORY_ROADMAP.md` — scoring factory
- `backend/autonomous/templates/` — implementación
- `backend/autonomous/learning/runLearningEngine.ts` — orquestador
