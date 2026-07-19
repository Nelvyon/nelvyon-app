# Investigación strategy_coherence — causa raíz

**Fecha:** 2026-07-12  
**Hardware:** RTX 3050 6 GB VRAM · 32 GB RAM · Ollama local  
**Eval:** 45 casos `gateCategory=strategy` (sin modificar benchmark)

---

## Preguntas investigadas

### 1. ¿El límite es realmente el modelo 3B?

**Parcialmente.** Evidencia v5_1:

| Métrica | Valor |
|---|---|
| Strategy avg score | **81.5%** (12/45 fallos) |
| Casos con RAG=4 docs y score 0% | **6** (modelo ignora pregunta) |
| Casos `refusal_with_context` | **5** (60% cada uno) |
| Varianza mismo seed | seo-01: **0%** en v5_1, **100%** en stability run 1 |

**Conclusión:** el 3B es insuficiente para prompts sobrecargados y muestra varianza alta, pero **no es el único factor**. Con prompt correcto + hechos verificados del RAG, varios casos pasan de forma estable.

---

### 2. ¿Puede mejorar sin cambiar hardware?

**Sí — causa raíz arquitectónica identificada:**

| Problema | Evidencia | Fix arquitectónico |
|---|---|---|
| Plantilla 12 secciones en preguntas fáciles | seo-01: respuesta genérica de auditoría SEO sin "pillar/cluster" pese a RAG con "Topic clusters, pillar pages" | `StrategyIntentClassifier` → modo **direct** vs **full_plan** |
| RAG recupera chunk incorrecto | analytics_reporting-01: top doc OS_LEARNING (`rankSeedsByCvr`) vs línea correcta en `saas_analytics_tech.md` | Boost knowledge_pack + penalizar OS_LEARNING fuera de queries learning |
| Modelo niega contexto existente | business_strategy-04, content-04: empieza con "No tengo información" + cita [1] | HECHOS VERIFICADOS inyectados + modo direct |
| Prompt JSON mezclado con citas | automation-02 (ya resuelto v5_1) | Normalizer schema |

**Implementado en v6:**

- `StrategyIntentClassifier.ts` — intención determinista
- `StrategyPromptBuilder.ts` — prompt direct vs plan 12 secciones
- `ContextFactExtractor.ts` — hechos verificados pre-LLM
- `LocalRagRetriever.ts` — boosts analytics dashboard / knowledge_pack

---

### 3. ¿Pipeline híbrido 3B + 8B elimina variabilidad?

**Hipótesis:** reduce varianza en casos `strategic_plan` (expert/hard); no necesario en JSON/seguridad.

Prototipo existente: `BENCHMARK_STRATEGY_MODEL` → solo `gateCategory=strategy`.

**Prueba requerida:** ejecutar `scripts/local-ai-strategy-investigation.ts` con y sin 8B.

---

### 4. ¿Mejores modelos open-weight en RTX 3050 6 GB?

| Modelo | VRAM estimada q4_K_M | Uso recomendado |
|---|---|---|
| llama3.2:3b | ~2.5 GB full GPU | Seguridad, JSON, clasificación, RAG Q&A directo |
| llama3.1:8b (22 capas GPU) | ~4.4 GB + RAM offload | Estrategia compleja, planes multi-sección |
| qwen2.5:7b-instruct | Similar a 8B | Alternativa a probar si 8B no estabiliza |
| phi3:mini | Descartado en fase anterior | Peor tool calling |

**Límite físico:** modelos >8B cuantizados requieren offload masivo → latencia >15s/caso en strategy; no viable para 80 casos interactivos en 6 GB.

---

### 5. ¿Mejora sin fine-tuning?

**Sí**, vía capas deterministas (no ML adicional):

1. Guardia seguridad (hecho)
2. Intención de prompt (v6)
3. Hechos verificados del RAG (v6)
4. Retrieval boosts por dominio/intención (v6)
5. Híbrido 8B solo estrategia (empírico)
6. Post-proceso citas/JSON (hecho)

Fine-tuning no es necesario para cerrar el gap si la arquitectura separa **Q&A directo** (3B) de **planificación** (8B).

---

## Arquitectura objetivo (mantenible)

```
Query
  → SecurityGuard (determinista)
  → RAG + boosts intención
  → ContextFactExtractor → HECHOS VERIFICADOS
  → StrategyIntentClassifier → prompt direct | full_plan
  → Modelo: 3B (default) | 8B (solo strategic_plan / gate strategy opcional)
  → CitationValidator + DirectAnswer supplement
  → Respuesta
```

Sin router general · Sin agentes · Sin MCP · Preparado para añadir capas después.

---

## Comandos de verificación

```powershell
# Tests arquitectura
pnpm -C apps/web exec vitest run backend/saas/__tests__/localAiStrategyArchitecture.test.ts

# Solo strategy (45 casos) — 3B v6
$env:PRIVATE_MODE="1"
$env:INVESTIGATION_TAG="v6_3b"
pnpm -C apps/web exec tsx ../../scripts/local-ai-strategy-investigation.ts

# Strategy — híbrido 8B
$env:BENCHMARK_STRATEGY_MODEL="llama3.1:8b-instruct-q4_K_M"
$env:OLLAMA_STRATEGY_NUM_GPU="22"
$env:INVESTIGATION_TAG="v6_hybrid"
pnpm -C apps/web exec tsx ../../scripts/local-ai-strategy-investigation.ts

# Benchmark completo
$env:BENCHMARK_TAG="v6_architecture"
pnpm -C apps/web exec tsx ../../scripts/local-ai-definitive-benchmark.ts
```

---

## Resultados empíricos (2026-07-12)

| Config | Strategy avg | Gates totales | Evidencia |
|---|---|---|---|
| v5_1 (3B, plantilla 12§ siempre) | **81.5%** | 14/15 | `definitive_v5_1_*.json` |
| v6 (3B, intent + hechos + RAG fix) | **92.4%** | 14/15 | `definitive_v6_architecture_*.json` |
| v6 strategy-only (3B) run A | **93.3%** | — | `strategy_investigation_v6_3b_*.json` |
| v6 strategy-only (3B) run B | **94.7%** | — | `strategy_investigation_v6_3b_fixed_*.json` |
| **v6 hybrid (3B + 8B strategy)** | **100.0%** | pendiente full 80 | `strategy_investigation_v6_hybrid_*.json` |

### Casos que fallan con 3B (varían entre runs — misma seed)

Evidencia de **varianza del modelo**, no de RAG vacío: todos tienen 4 documentos recuperados.

| Run | Casos 0% / 60% |
|---|---|
| v6 full 3B | content-01, analytics_reporting-03, finance_operations-03/04 |
| v6_3b_fixed | email_marketing-04, analytics_reporting-03, finance_operations-04 |
| v6 hybrid 8B | **ninguno** (45/45) |

### Respuesta híbrido 8B

**Sí elimina el gap de strategy_coherence** en prueba aislada (45/45, avg 100%).  
No es un parche de benchmark: es routing por tipo de tarea (3B rápido + 8B razonamiento), sin router general ni agentes.

Config producción:

```powershell
OLLAMA_MODEL=llama3.2:3b-instruct-q4_K_M
OLLAMA_STRATEGY_MODEL=llama3.1:8b-instruct-q4_K_M
OLLAMA_STRATEGY_NUM_GPU=22
```
