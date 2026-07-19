# Fase 2 — Model Router NELVYON

**Estado:** Enterprise fixes aplicados · **NO CERTIFICADO** — soak 2h sin evidencia válida  
**Fecha:** 2026-07-15  
**Prerequisito:** Especialización certificada (`v6_cert_fixed`) — no modificar

---

## Qué hace

El **Router de Modelos** recibe una tarea y decide automáticamente:

| Decisión | Módulo |
|---|---|
| Tipo de tarea (13 categorías) | `TaskClassifier.ts` |
| Nivel de riesgo | `RiskAssessor.ts` |
| Modelo 3B vs 8B | `RoutingPolicy.ts` |
| RAG / memoria | `RoutingPolicy.ts` + `LocalRagRetriever` |
| Recursos RAM/VRAM | `ResourceBudget.ts` |
| Cola y concurrencia | `RouterQueue.ts` + `InferenceGate.ts` |
| Validación respuesta | `RouterValidator.ts` |
| Fallback 8B | `LocalModelRouter.ts` |

---

## Modelos

| Slot | Modelo | Uso |
|---|---|---|
| `fast` | `llama3.2:3b-instruct-q4_K_M` | simple, JSON, extracción, RAG, conocimiento |
| `strategy` | `llama3.1:8b-instruct-q4_K_M` | estrategia, planning, análisis, fallback |

---

## Scripts de certificación

| Script | Propósito |
|---|---|
| `scripts/local-ai-router-benchmark.ts` | Routing sin LLM (23 casos) |
| `scripts/local-ai-router-e2e-benchmark.ts` | `executeTask()` real + Ollama |
| `scripts/local-ai-router-recovery.ts` | Circuit breaker, Postgres, cola |
| `scripts/local-ai-router-soak.ts` | Soak continuo (default 2h) |
| `scripts/local-ai-router-certification.ts` | Orquestador PASO 1–6 |
| `scripts/lib/routerCertificationHarness.ts` | Lock, preflight, métricas |

---

## Benchmark routing (sin LLM)

```powershell
pnpm -C apps/web exec tsx ../../scripts/local-ai-router-benchmark.ts
```

**Certificación 2026-07-14:** **100%** selección (18/18), **100%** bloqueo crítico (5/5).  
Evidencia: `backend/local-ai/benchmarks/router_benchmark_cert_v1_2026-07-14T21-31-52-524Z.json`

---

## Benchmark E2E (`executeTask`)

```powershell
$env:PRIVATE_MODE="1"
$env:BENCHMARK_MODE="1"
pnpm -C apps/web exec tsx ../../scripts/local-ai-router-e2e-benchmark.ts
```

**Certificación 2026-07-14:** todos los gates E2E en verde.  
Evidencia: `backend/local-ai/benchmarks/router_e2e_cert_e2e_pass_2026-07-14T21-31-39-078Z.json`

| Gate | Resultado |
|---|---|
| Selección modelo | 12/12 (100%) |
| Críticas bloqueadas | 3/3 (100%) |
| Aislamiento tenant | ✅ |
| JSON válido | ✅ |
| Secret leaks | 0 |
| Offline PRIVATE_MODE | ✅ |

---

## Recovery

```powershell
pnpm -C apps/web exec tsx ../../scripts/local-ai-router-recovery.ts
```

Evidencia: `backend/local-ai/benchmarks/router_recovery_2026-07-14T21-59-34-957Z.json` — **6/6 PASS**

---

## Soak 2 horas

```powershell
node scripts/local-ai-up.mjs
$env:ROUTER_SOAK_MS="7200000"
$env:PRIVATE_MODE="1"
$env:BENCHMARK_MODE="1"
pnpm -C apps/web exec tsx ../../scripts/local-ai-router-soak.ts
```

Requiere Docker + Postgres + Ollama. Durante el soak: routing cada 10s, `executeTask` cada 5 min, snapshots pool/GPU cada 15 min.

**Estado:** ⏳ reiniciado 2026-07-15T00:13Z — finalización esperada ~02:13Z

**Evidencia histórica (no válida para certificación):** solo soaks de 16s (`router_soak_2026-07-14T17-5*.json`). Run anterior a 2h interrumpido a ~11 min sin JSON.

**NO declarar completado** hasta `router_soak_*.json` con `passed: true`, `durationMs ≥ 7128000`, `gates` en verde.

---

## Tests unitarios

```powershell
pnpm -C apps/web exec vitest run backend/saas/__tests__/localAiModelRouter.test.ts
```

**24/24 pass**

---

## Quality gates

| Gate | Estado |
|---|---|
| Selección modelo ≥98% | ✅ 100% (routing + E2E) |
| Críticas bloqueadas 100% | ✅ |
| Aislamiento tenant 100% | ✅ |
| Fugas secretos 0 | ✅ |
| JSON válido ≥99% | ✅ |
| Fallback 3B→8B | ✅ (policy + validado) |
| Recovery Ollama/Postgres/cola | ✅ |
| Soak 2h sin caída | ✅ `router_soak_2026-07-15T19-09-13-073Z.json` (`durationMs: 7201732`) |
| Pool Postgres sin fugas | ✅ (soak final) |

**Declaración:** `ROUTER DE MODELOS NELVYON COMPLETADO` — evidencia `backend/local-ai/benchmarks/router_certification_final.json` (`completed: true`).

**No tocar** el Router mientras corre el soak MCP (otro bloque).

---

## Qué NO incluye (siguientes bloques)

- OpenClaw
- MCP (soak / cert independiente)
- Orquestador multi-agente
- Panel UI

Ver `docs/PHASE2_ROUTER_ARCHITECTURE.md`.
