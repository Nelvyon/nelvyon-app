# NELVYON — Autonomous Phase C (LLM + QA offline)

**Versión:** 1.0  
**Fase:** AUTONOMOUS-PHASE-C  
**Estado:** Semiautomático aislado — sin DB, sin portal, sin producción

---

## 1. Objetivo

Evolución de Phase B (mock puro) a **generación semiautomática** con:

- **LLM adapter** (OpenAI si hay key, fallback mock)
- **Prompts Phase A** ejecutables
- **QA offline** multidimensional (score ≥ 85)
- **Wrappers aislados** landing / chatbot / SEO
- **Outputs** en `backend/autonomous/output/phase-c/`

---

## 2. Arquitectura

```
run-phase-c.ts
    → simulatorPhaseC.ts
        → runPipelinePhaseC.ts (async)
            → llmAgents.ts → llmAdapter.ts (mock | real)
            → wrappers/* (build aislado)
            → offlineScorer.ts (QA ≥ 85)
        → osPublishPayload.ts (dry_run=true)
```

| Componente | Ruta |
|------------|------|
| LLM adapter | `backend/autonomous/llm/llmAdapter.ts` |
| Prompt templates | `backend/autonomous/llm/promptTemplates.ts` |
| LLM agents | `backend/autonomous/agents/llmAgents.ts` |
| QA offline | `backend/autonomous/qa/offlineScorer.ts` |
| Validators | `backend/autonomous/qa/artifactValidators.ts` |
| Wrappers | `backend/autonomous/wrappers/*.ts` |
| Pipeline C | `backend/autonomous/pipelines/runPipelinePhaseC.ts` |

---

## 3. LLM Adapter

### Modos

| Modo | Condición |
|------|-----------|
| **mock** | Sin `OPENAI_API_KEY` o `AUTONOMOUS_LLM_MODE=mock` |
| **real** | `OPENAI_API_KEY` presente y modo no forzado a mock |

### Fallback automático

Si modo real falla (HTTP, JSON inválido, timeout 60s) → **mockGenerator** sin lanzar excepción.

### Logs (stderr)

```
[autonomous-llm] agent=agent-copywriter-landing mode=mock model=mock-rules-v1 ok=true tokens=0 ms=12 fallback=...
```

**No se loguean** prompts ni contenido cliente.

### Variables entorno

| Variable | Uso |
|----------|-----|
| `OPENAI_API_KEY` | API key OpenAI |
| `AUTONOMOUS_LLM_MODE` | `mock` \| `real` (override) |
| `AUTONOMOUS_OPENAI_MODEL` | Default `gpt-4o-mini` |

---

## 4. Prompts Phase A → ejecutables

Plantillas en `promptTemplates.ts` derivadas de:

- `LANDING_AGENT_PROMPTS.md`
- `CHATBOT_AGENT_PROMPTS.md`
- `SEO_AGENT_PROMPTS.md`

Cada agente: `getSystemPrompt(role)` + `buildUserPrompt(role, payload)`.

Salida LLM: **JSON object** (`response_format: json_object` en modo real).

---

## 5. QA offline (score 0–100)

### Dimensiones Phase C

| Dimensión | Max pts | Qué mide |
|-----------|---------|----------|
| `brief_compliance` | 15 | Campos obligatorios brief |
| `structure` | 15 | Artefactos requeridos por SKU |
| `consistency` | 15 | CTA, template_id, páginas SEO |
| `copy_quality` | 20 | Headline, FAQ, KB, titles |
| `seo_basic` | 15 | Meta, canonical, informe 10 § |
| `completeness` | 20 | Rubric Phase B integrada |

**Umbral:** ≥ **85** · Bloqueantes cap a 84 · Máx **3 reintentos** → `ESCALATE_OPERATOR`

### Reintentos

1. Pipeline se re-ejecuta con `retry_count++`
2. Copywriter recibe `retry_attempt` en payload
3. Historial en `retryHistory.json`

---

## 6. Wrappers aislados

| SKU | Wrapper | Producción |
|-----|---------|------------|
| Landing | `landingBuilder.ts` | `production_deploy: false` |
| Chatbot | `chatbotBuilder.ts` | `chatbot_service_mock_wrapper` |
| SEO | `seoGenerator.ts` | `external_apis: false` |

No invocan `landing_builder_service`, `chatbot_service` ni GSC reales.

---

## 7. Outputs (`output/phase-c/{sku}/`)

| Archivo | Contenido |
|---------|-----------|
| `artifacts.json` | Todos los artefactos agente |
| `qaResult.json` | Score + `offline_dimensions` |
| `retryHistory.json` | Intentos QA |
| `osPublishPayload.json` | **dry_run: true** |
| `project.json` | Estado proyecto completo |

### os_deliverables (simulado)

Ver `osPublishPayload.json` — acciones OS **no ejecutadas**:

- `deliverable.create` → `published`
- `project.update_status` → `CLIENTE_REVISION`
- `task.complete` → `QA_AUTONOMOUS`

---

## 8. Cómo ejecutar

### Mock (default)

```bash
pnpm -C apps/web autonomous:phase-c all
pnpm -C apps/web autonomous:phase-c landing
```

### Real con OpenAI

```bash
# PowerShell
$env:OPENAI_API_KEY="sk-..."
pnpm -C apps/web autonomous:phase-c landing

# Bash
OPENAI_API_KEY=sk-... pnpm -C apps/web autonomous:phase-c all
```

### Forzar mock (aunque haya key)

```bash
$env:AUTONOMOUS_LLM_MODE="mock"
pnpm -C apps/web autonomous:phase-c all
```

### Tests

```bash
pnpm -C apps/web exec vitest run ../../backend/autonomous/__tests__/
```

---

## 9. Orden agentes (igual Phase A/B)

### Landing
`agent-pm` → `strategist` → `copywriter` → `designer` → `builder wrapper` → `seo` → `QA`

### Chatbot
`agent-pm` → `strategist` → `copywriter` → `chatbot wrapper` → `QA`

### SEO
`agent-pm` → `strategist` → `audit` → `keywords` → `copywriter on-page` → `report` → `seo wrapper` → `QA`

---

## 10. Fuera de alcance (confirmado)

- Base de datos
- Portal cliente
- OS core mutations
- SaaS
- Web pública / deploy real
- APIs GSC, crawl, Meta, Google

---

## 11. Phase D (siguiente)

1. Webhook delgado `OsPublishPayload` → `os_deliverables` (staging)
2. Conectar builders reales detrás de feature flag `AUTONOMOUS_PRODUCTION=false`
3. Playwright QA en CI
4. Panel ops para `ESCALATE_OPERATOR`

---

*Phase C LLM+QA v1.0 — NELVYON Autonomous*
