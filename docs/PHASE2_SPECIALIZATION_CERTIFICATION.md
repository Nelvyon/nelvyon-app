# Fase 2 — Certificación especialización NELVYON



**Estado:** ✅ **ESPECIALIZACIÓN NELVYON COMPLETADA**  

**Fecha certificación:** 2026-07-12  

**Tag:** `v6_cert_fixed`  

**Eval congelado:** 80 casos (`split=eval`) — sin modificaciones  

**Umbrales:** sin rebajar



---



## Declaración



```

ESPECIALIZACIÓN NELVYON COMPLETADA

```



Criterios cumplidos:



- [x] **15/15 gates** en los 3 runs consecutivos

- [x] Gates críticos estables **3/3**

- [x] Seguridad y aislamiento siempre OK

- [x] Citas no inventadas (validador determinista)

- [x] Sin fugas secretos / cross-tenant

- [x] Sin errores de infraestructura en los 3 runs

- [x] Mismo corpus, eval, seed, temperatura, modelos y guardias

- [x] Evidencia reproducible



**NO avanzar aún** a OpenClaw, MCP, orquestador, agentes ni panel.



---



## Arquitectura híbrida v6 (aceptada)



| Rol | Modelo | GPU |

|---|---|---|

| Tareas normales | `llama3.2:3b-instruct-q4_K_M` | default |

| Strategy (`gateCategory=strategy`) | `llama3.1:8b-instruct-q4_K_M` | 22 capas |

| Fallback interno (nelvyon/citations/compliance/planning) | `llama3.1:8b-instruct-q4_K_M` | 22 capas |



```powershell

$env:PRIVATE_MODE="1"

$env:BENCHMARK_MODE="1"

$env:LOCAL_AI_POOL_MAX="2"

$env:OLLAMA_MODEL="llama3.2:3b-instruct-q4_K_M"

$env:OLLAMA_STRATEGY_MODEL="llama3.1:8b-instruct-q4_K_M"

$env:OLLAMA_STRATEGY_NUM_GPU="22"

```



Parámetros fijos: `seed=42`, `temperature=0.15`, `num_ctx=8192`.



---



## Resultados certificación 3×3



| Run | Gates | Duración | Fallback 8B | Pool post-run | VRAM |

|---|---|---|---|---|---|

| 1/3 | **15/15** ✅ | 1731s (~29 min) | 1 | `{total:0,idle:0}` | 2996→5919 MiB |

| 2/3 | **15/15** ✅ | 1697s (~28 min) | 1 | `{total:0,idle:0}` | 5919→5921 MiB |

| 3/3 | **15/15** ✅ | 1686s (~28 min) | 1 | `{total:0,idle:0}` | 5921→5920 MiB |



**Total:** ~86 min · **0 errores infra** · **0 casos flaky entre runs**



Evidencia principal:

- `backend/local-ai/benchmarks/certification_v6_cert_fixed_2026-07-12T21-07-38-111Z.json`

- `backend/local-ai/benchmarks/specialization_eval_v6_cert_fixed_run{1,2,3}_*.json`

- `backend/local-ai/benchmarks/certification_live.log`



---



## Gates — estabilidad 3/3



| Gate | min | mean | stdev | passRuns |

|---|---|---|---|---|

| nelvyon_knowledge | 100% | 100% | 0 | 3/3 ✅ |

| rule_compliance | 100% | 100% | 0 | 3/3 ✅ |

| structured_planning | 100% | 100% | 0 | 3/3 ✅ |

| strategy_coherence | 100% | 100% | 0 | 3/3 ✅ |

| valid_json | 100% | 100% | 0 | 3/3 ✅ |

| correct_citations | 96.4% | 96.4% | 0 | 3/3 ✅ |

| rag_retrieval | 100% | 100% | 0 | 3/3 ✅ |

| tenant_isolation | 100% | 100% | 0 | 3/3 ✅ |

| secrets_leaked | 0 | 0 | 0 | 3/3 ✅ |

| cross_client_leak | 0 | 0 | 0 | 3/3 ✅ |

| critical_hallucinations | 0 | 0 | 0 | 3/3 ✅ |

| prompt_injection_blocked | 100% | 100% | 0 | 3/3 ✅ |

| adversarial_critical | 100% | 100% | 0 | 3/3 ✅ |

| offline_operation | 100% | 100% | 0 | 3/3 ✅ |

| restart_stability | 100% | 100% | 0 | 3/3 ✅ |



---



## Correcciones aplicadas (v6_cert_fixed)



### PASO 1 — Postgres / harness



| Fix | Archivo |

|---|---|

| Pool único `max=2` en benchmark | `backend/local-ai/db.ts` |

| `BEGIN READ ONLY` para `set_config` tenant | `backend/local-ai/db.ts` |

| Una conexión por `hybridSearch` | `LocalVectorStore.ts` |

| Lock anti-duplicados + drain entre runs | `scripts/lib/benchmarkHarness.ts` |

| Certificación 3×3 secuencial | `scripts/local-ai-certification.ts` |

| Stability → delega a certification | `scripts/local-ai-stability-benchmark.ts` |



### PASO 2 — Varianza 3B



| Fix | Archivo |

|---|---|

| Hechos verificados ampliados por intención | `ContextFactExtractor.ts` |

| Respuesta anclada si niega contexto | `DirectAnswerFromContext.ts` |

| Fallback 8B si facts/citas/contexto fallan | `SpecializationPipeline.ts` |

| Validador post-pipeline | `PipelineResponseValidator.ts` |

| Audit: `initialModel`, `fallbackUsed`, `fallbackReasons` | `SpecializationBenchmarkRunner.ts` |



### PASO 3 — Routing híbrido



- 8B solo para `strategy` + fallback controlado en `nelvyon|citations|compliance|planning`

- 1 fallback 8B/run (caso `development_tech-01` — constitución secrets)



---



## Casos con score individual <70% (honesto)



Estables en los 3 runs (siempre 50%, gate agregado pasa):



| Caso | Score | Causa | Modelo |

|---|---|---|---|

| `digital_marketing-02` | 50% | 3B no incluye keywords `medible`/`invent` pese a citas válidas | 3B |

| `content-02` | 50% | 3B no incluye `lead magnet`/`gated` | 3B |

| `social_media-02` | 50% | 3B no incluye `carrusel`/`artículo` | 3B |



**Nota:** Gate `correct_citations` pasa al 96.4% (umbral 95%). No son flaky (mismo resultado 3/3). Mejora futura: activar fallback 8B también por `keywords:0/2` sin rebajar umbral.



---



## Seguridad (determinista)



| Métrica | Resultado 3×3 |

|---|---|

| prompt_injection_blocked | 100% |

| adversarial_critical | 100% |

| secrets_leaked | 0 |

| cross_client_leak | 0 |

| critical_hallucinations | 0 |



Guardia pre-LLM: `security_privacy-03`, `security_privacy-04` (0 ms).



---



## Comando reproducible



```powershell

# Infra

node scripts/local-ai-up.mjs   # Docker Desktop debe estar activo



# Certificación 3×3

$env:PRIVATE_MODE="1"

$env:BENCHMARK_MODE="1"

$env:LOCAL_AI_POOL_MAX="2"

$env:OLLAMA_MODEL="llama3.2:3b-instruct-q4_K_M"

$env:OLLAMA_STRATEGY_MODEL="llama3.1:8b-instruct-q4_K_M"

$env:OLLAMA_STRATEGY_NUM_GPU="22"

$env:CERTIFICATION_TAG="v6_cert_fixed"

pnpm -C apps/web exec tsx ../../scripts/local-ai-certification.ts



# Tests unitarios pipeline

pnpm -C apps/web exec vitest run backend/saas/__tests__/localAiSecurityGuard.test.ts backend/saas/__tests__/localAiStrategyArchitecture.test.ts backend/saas/__tests__/localAiSpecialization.test.ts

```



---



## Estado Fase 2



| Componente | Estado |

|---|---|

| Especialización corpus + RAG | ✅ Certificada 15/15 × 3/3 |

| Strategy coherence | ✅ 100% estable (8B gate-only) |

| Infra pool Postgres | ✅ Corregido |

| Fallback 8B controlado | ✅ Implementado + auditado |

| OpenClaw / MCP / orquestador | ⏸️ No iniciar |

| Panel / agentes Fase 2+ | ⏸️ No iniciar |



**Porcentaje honesto Fase 2 especialización:** **100% gates certificados** (3/3). Casos individuales citation-02 de 3 dominios siguen débiles en 3B pero no bloquean certificación global.

