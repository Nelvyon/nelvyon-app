# Fase 2 — Auditoría pipeline especialización (2026-07-11)

## Resumen ejecutivo

La especialización **no estaba fallando por el modelo** en la mayoría de gates, sino por **bugs del harness de benchmark, evaluadores y corpus RAG**. Se corrigió el pipeline; la re-medición end-to-end requiere Docker Postgres + Ollama activos.

**Estado gates (run roto anterior):** 1/7 PASS  
**Estado pipeline (código):** corregido + 15 tests unitarios PASS  
**Re-benchmark E2E:** pendiente — Docker daemon no disponible en esta sesión

---

## Contradicciones investigadas

### 1. `valid_json` 0% vs benchmark hardware JSON 100%

| Aspecto | Benchmark hardware (`local-ai-benchmark.mjs`) | Benchmark especialización (roto) |
|---|---|---|
| API | `/api/generate` con instrucción explícita | `/api/generate` prompt plano |
| Instrucción JSON | "Responde ÚNICAMENTE con JSON…" | JSON **embebido en la pregunta** como si fuera la respuesta esperada |
| `format: json` | No | No |
| Resultado | Modelo devolvió JSON válido | Modelo respondió prosa → `bad_json` |

**Evidencia (json-01, run 19:53):**
```json
{
  "id": "json-01",
  "score": 0,
  "violations": ["bad_json"],
  "preview": "No tengo suficiente información para generar una respuesta precisa..."
}
```

**Corrección:** `json-01` usa prompt tipo hardware + `OllamaClient` `/api/chat` + `format: json` + `JsonOutputService` schema estricto `create_campaign` + 1 retry reparación local.

---

### 2. `rag_retrieval` 0% vs RAG smoke 0.685

| Aspecto | RAG smoke | Gate `rag` (roto) |
|---|---|---|
| Qué mide | Solo retrieval vectorial | Retrieval **+** respuesta LLM en un solo score |
| Corpus | Tenant efímero con doc smoke | Tenant ingest — **sin** `NELVYON-RAG-SMOKE-2026` |
| Probe rag-01 | Código en doc dedicado | Código **no indexado** en `platform.md` |

**Causa raíz doble:**
1. El evaluador mezclaba "¿el LLM dijo 5434?" con "¿RAG recuperó 5434?"
2. `NELVYON-RAG-SMOKE-2026` solo existía en `rag-smoke-nelvyon.txt` (tenant temporal), no en el corpus de especialización.

**Corrección:**
- Gate `rag` usa **solo** `evaluateRetrieval()` (probe en citations/context, top score, count).
- Añadido `NELVYON-RAG-SMOKE-2026` a `knowledge/nelvyon/platform.md`.
- RAG híbrido vectorial + léxico + rerank local en `LocalVectorStore`.
- Script `local-ai-rag-retrieval-benchmark.ts` (sin LLM) para validar retrieval aislado.

---

### 3. `rule_compliance` 100% con planificación/estrategia 20%

**Falso positivo:** `sec-01` y `email-01` obtuvieron 1.0 por contener palabras `rls`/`tenant` o `spf`/`dkim` en texto de rechazo ("no tengo suficiente información…").

**Causa:** scoring solo por keywords sin penalizar rechazos indebidos.

**Corrección:** `evaluateResponse()` penaliza `refusal_with_context_expected` cuando no es caso adversarial.

**Planificación 20%:** el modelo no generó las 16 secciones; además el evaluador solo buscaba 10 secciones. Ahora son **16 secciones** obligatorias (`PlanTemplate.ts`) y prompt de plan con plantilla por disciplina.

---

## Otros bugs del harness anterior

| Bug | Impacto |
|---|---|
| Constitución reducida a 2 líneas vs `CONSTITUTION_RULES.systemPromptPrefix` | Respuestas genéricas, ignoran contexto |
| `/api/generate` sin roles system/user | Constitución no priorizada |
| `ragConfidence: 0` en varios casos | Subprocess probe falló silenciosamente → contexto vacío |
| Sin audit trail | Imposible depurar PASS/FAIL |
| Benchmark inline duplicado en `.mjs` desincronizado de `benchmarkSuite.ts` | Casos y categorías incorrectas |

---

## Correcciones aplicadas (archivos)

| Componente | Archivo |
|---|---|
| Cliente Ollama chat + JSON format | `backend/local-ai/OllamaClient.ts` |
| Prompt constitución + RAG + modos JSON/plan | `backend/local-ai/specialization/PromptBuilder.ts` |
| Evaluadores separados retrieval/response | `backend/local-ai/specialization/BenchmarkEvaluator.ts` |
| JSON schema + retry | `backend/local-ai/specialization/JsonOutputService.ts` |
| Plan 16 secciones | `backend/local-ai/specialization/PlanTemplate.ts` |
| RAG híbrido + rerank + dedup + top_k dinámico | `backend/local-ai/LocalVectorStore.ts`, `LocalRagRetriever.ts` |
| Benchmark dev/eval + casos corregidos | `backend/local-ai/specialization/benchmarkSuite.ts` |
| Runner con audit completo | `backend/local-ai/specialization/SpecializationBenchmarkRunner.ts` |
| Script benchmark | `scripts/local-ai-specialization-benchmark.ts` |
| RAG-only benchmark | `scripts/local-ai-rag-retrieval-benchmark.ts` |
| Knowledge packs ampliados | `knowledge/domains/*.md` (+5 packs) |
| Tests | `backend/saas/__tests__/localAiBenchmarkEvaluator.test.ts` |

---

## Audit trail por test (nuevo runner)

Cada registro en el JSON de salida incluye **sin ocultar**:

- `question`, `expandedQuery`
- `documentsRetrieved[]` (sourceId, score, preview)
- `retrievalScores`, `retrievalEval` (probeFound, violations)
- `promptSystem`, `promptUser`, `promptFull`
- `responseRaw`, `responseParsed`, `parserResult`
- `responseEval`, `passCriteria`, `passed`
- `retrievalMs`, `generationMs`

---

## Benchmark ampliado

| Métrica | Antes | Ahora |
|---|---|---|
| Casos totales | 24 inline / 14 mjs | **49** en `benchmarkSuite.ts` |
| Split dev/eval | No | Sí (`split: "dev" \| "eval"`) |
| Casos eval (gates) | mezclados | **28** casos eval |
| Dominios con casos | ~12 | **20** (supplemental dev por dominio) |
| Casos adversariales eval | 2 | 2 eval + 1 dev |
| JSON | prompt roto | prompt + schema estricto |
| RAG | mezclado con LLM | gate aislado + 3 probes |

> Objetivo ≥10 casos/dominio: estructura lista; supplemental dev añade 1 caso/dominio. Ampliar eval a 10/dominio es trabajo incremental sin tocar prompts sobre eval.

---

## Comandos reproducibles

```bash
# 1. Infra
node scripts/local-ai-up.mjs
pnpm -C apps/web exec tsx ../../scripts/local-ai-ingest-knowledge.ts

# 2. RAG retrieval only (sin LLM)
pnpm -C apps/web exec tsx ../../scripts/local-ai-rag-retrieval-benchmark.ts

# 3. Benchmark especialización (eval set — gates)
pnpm -C apps/web exec tsx ../../scripts/local-ai-specialization-benchmark.ts

# 4. Dev set (tuning, no gates finales)
LOCAL_AI_BENCHMARK_SPLIT=dev pnpm -C apps/web exec tsx ../../scripts/local-ai-specialization-benchmark.ts

# 5. Tests
pnpm -C apps/web exec vitest run backend/saas/__tests__/localAiBenchmarkEvaluator.test.ts backend/saas/__tests__/localAiSpecialization.test.ts
```

---

## PASO 6 — Comparación modelos (pendiente re-run)

Tras re-ingest + benchmark con pipeline corregido:

```bash
OLLAMA_MODEL=llama3.2:3b-instruct-q4_K_M pnpm -C apps/web exec tsx ../../scripts/local-ai-specialization-benchmark.ts
OLLAMA_MODEL=qwen2.5:3b-instruct-q4_K_M pnpm -C apps/web exec tsx ../../scripts/local-ai-specialization-benchmark.ts
```

Métricas: calidad, RAG (retrieval aislado), JSON, planificación, español, latencia, estabilidad.

---

## Límites reales modelo/hardware (honestos)

- **llama3.2:3b** en RTX 3050 6GB: viable para JSON corto y RAG; plan 16 secciones expertas puede truncar o omitir secciones → gate `structured_planning` puede fallar por **capacidad del modelo**, no solo pipeline.
- **qwen2.5:3b**: candidato alternativo; no re-evaluado con pipeline corregido aún.
- Gates al 95–99% con 3B local es **ambicioso**; el pipeline ahora separa fallo de harness vs fallo de modelo.

---

## % honesto

| Área | % |
|---|---|
| Infra Fase 2 | ~95% |
| Pipeline especialización (código) | ~85% |
| Corpus conocimiento | ~55% (130+ fuentes, packs ampliados, falta densidad por dominio) |
| Benchmark eval representativo | ~45% (estructura OK, densidad 10/dominio pendiente) |
| Gates superados (medición real) | ~14% (último run roto; re-run pendiente) |
| **Especialización cerrada** | **NO** |

---

## Antes del router

1. Arrancar Docker + re-ingest corpus actualizado  
2. Ejecutar `local-ai-rag-retrieval-benchmark.ts` → confirmar `rag_retrieval` ≥95%  
3. Ejecutar benchmark eval completo con llama3.2 y qwen2.5  
4. Documentar qué gates fallan por modelo vs pipeline  
5. Ampliar eval a ≥10 casos/dominio (sin tunear prompts sobre eval)  
6. Solo entonces: router, OpenClaw, MCP, orquestador, agentes
