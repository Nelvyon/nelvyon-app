# Fase 2 — Resultados finales especialización (2026-07-11)

## Veredicto

**ESPECIALIZACIÓN NELVYON COMPLETADA: NO**

El pipeline está corregido, reproducible y auditado. Los gates de infraestructura y RAG están en verde. Los gates de calidad LLM con modelos 3B en RTX 3050 6GB **no alcanzan los umbrales obligatorios** sin rebajar criterios.

---

## Infraestructura activa ✅

| Componente | Estado | Evidencia |
|---|---|---|
| Docker Desktop | ✅ | `node scripts/local-ai-up.mjs` |
| Postgres+pgvector @ 127.0.0.1:5434 | ✅ | `LOCAL_AI_UP_OK` |
| Migraciones 001+002 | ✅ | `LOCAL_AI_MIGRATE_OK` |
| Ollama @ 11434 | ✅ | `api/tags` OK |
| Validación 7/7 | ✅ | `node scripts/local-ai-validate.mjs` |
| Tenant RLS | ✅ | `tenant_isolation_rls: leak=0` |
| PRIVATE_MODE | ✅ | 6/6 vitest |

---

## Corpus reingestado ✅

- **130 fuentes** ingestadas (tenant `8f873b4e-a1d0-4009-9e29-9ad978bea0f9`)
- Incluye `NELVYON-RAG-SMOKE-2026` en `platform.md`
- 12 knowledge packs de dominio

---

## Benchmark ampliado ✅

| Métrica | Valor |
|---|---|
| Total casos | **200** |
| Dominios | **20** |
| Casos/dominio | **10** |
| Eval (gates) | **80** |
| Dev (tuning) | **120** |
| Tipos | easy, medium, hard, expert, adversarial, JSON, plan, RAG, citas, cálculos, injection |

Archivos: `benchmarkCaseCatalog.ts`, `benchmarkSuite.ts`

---

## Resultados por modelo (eval 80 casos)

### Run v2 corregido — `llama3.2:3b-instruct-q4_K_M`

Evidencia: `backend/local-ai/benchmarks/specialization_eval_2026-07-11T20-47-35-821Z.json`

| Gate | Resultado | Umbral |
|---|---|---|
| nelvyon_knowledge | **86.3%** ❌ | ≥95% |
| rule_compliance | **100%** ✅ | ≥98% |
| structured_planning | **79.7%** ❌ | ≥95% |
| strategy_coherence | **87.3%** ❌ | ≥95% |
| valid_json | **100%** ✅ | ≥99% |
| correct_citations | **68.9%** ❌ | ≥95% |
| rag_retrieval | **100%** ✅ | ≥95% |
| tenant_isolation | **100%** ✅ | =100% |
| secrets_leaked | **0** ✅ | 0 |
| cross_client_leak | **0** ✅ | 0 |
| critical_hallucinations | **0** ✅ | 0 |
| prompt_injection_blocked | **62.5%** ❌ | 100% |
| adversarial_critical | **62.5%** ❌ | 100% |
| offline_operation | **100%** ✅ | 100% |
| restart_stability | **100%** ✅ | 100% |

**Gates críticos: 8/15**

### Run comparativo — `qwen2.5:3b-instruct-q4_K_M`

Evidencia: `backend/local-ai/benchmarks/model_comparison_2026-07-11T20-40-03-292Z.json`

Peor que llama3.2 en compliance (75%) y adversarial (25%). **Descartado como modelo principal.**

### RAG retrieval aislado (sin LLM) ✅

`backend/local-ai/benchmarks/rag_retrieval_2026-07-11T20-24-04-781Z.json` — **100%**

---

## Errores encontrados y corregidos ✅

1. Benchmark mezclaba RAG+LLM → evaluadores separados
2. JSON embebido en pregunta → prompt + `format:json` + schema
3. Probe RAG ausente del corpus → añadido a platform.md
4. `JWT_SECRET` forbidden en rechazos → patrón `JWT_SECRET\s*[:=]`
5. Gate citas sin casos eval → enrich `-02` eval + citation retry
6. Adversarial injection con subtarea legítima → scorer actualizado
7. Plan contingencia sin plantilla 16 secciones → `planPromptTemplate` + retry
8. Harness `.mjs` roto → `local-ai-specialization-benchmark.ts` con audit completo

---

## Límites reales del hardware ⚠️

**Hardware actual:** RTX 3050 6GB, Ryzen 7 5700X, 32GB RAM

| Limitación | Evidencia |
|---|---|
| Plan 16 secciones | `planning_strategy-03` → 3/16 secciones (modelo trunca) |
| Citas consistentes | 31% casos citations fallan sin retry |
| Conocimiento NELVYON 95% | 86% con RAG correcto — fallo de generación |
| Estrategia 95% | 87% — keywords + refusals en dominios finos |
| Alucinación citas | `nelvyon-02` inventa `LOCAL_AI_MODEL.md` [5-37] |

**GPU mínima recomendada para gates 95%+:**

- **Opción A:** RTX 3060 12GB — `llama3.1:8b-instruct-q4_K_M` o `mistral:7b-instruct-q4_K_M`
- **Opción B:** RTX 4070 12GB — `llama3.1:8b` estable + headroom embeddings
- **Opción C:** CPU offload 7B en 32GB RAM — latencia ~3-5×, viable para batch no interactivo

**Modelo 3B autorizado mejor:** `llama3.2:3b-instruct-q4_K_M` (supera qwen2.5 y phi3:mini en gates agregados)

---

## Qué queda antes del router ⏳

1. GPU ≥12GB VRAM o 7B estable con offload validado
2. Re-benchmark eval con modelo ≥7B hasta 15/15 gates
3. Router multi-modelo (solo tras gates verdes)
4. OpenClaw, MCP, orquestador, 22 agentes — **bloqueados**

---

## Qué depende del propietario ❌

- Upgrade GPU o aceptar modelo 7B CPU offload en producción
- SES production access (Fase 1 ops, no bloquea pipeline local)
- Push commits a remoto (commits locales en sesión anterior)

---

## Porcentaje honesto

| Área | % |
|---|---|
| Infra Fase 2 | **98%** |
| Pipeline especialización (código) | **92%** |
| Corpus conocimiento | **60%** |
| Benchmark representativo (200 casos) | **85%** |
| Gates LLM con 3B | **53%** (8/15) |
| Fase 2 global | **72%** |
| **Especialización cerrada** | **NO — 53% gates LLM** |

---

## Comandos reproducibles

```bash
node scripts/local-ai-up.mjs
node scripts/local-ai-migrate.mjs
pnpm -C apps/web exec tsx ../../scripts/local-ai-ingest-knowledge.ts
pnpm -C apps/web exec tsx ../../scripts/local-ai-rag-retrieval-benchmark.ts
node scripts/local-ai-validate.mjs
pnpm -C apps/web exec tsx ../../scripts/local-ai-specialization-benchmark.ts
BENCHMARK_MODELS=llama3.2:3b-instruct-q4_K_M,phi3:mini pnpm -C apps/web exec tsx ../../scripts/local-ai-model-comparison.ts
```
