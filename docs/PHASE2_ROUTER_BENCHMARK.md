# Benchmark — Model Router

## Scripts

| Script | LLM | Casos |
|---|---|---|
| `local-ai-router-benchmark.ts` | No | 23 routing |
| `local-ai-router-e2e-benchmark.ts` | Sí (`executeTask`) | 15 E2E |
| `local-ai-router-soak.ts` | Parcial (cada 5 min) | Continuo 2h |

## Routing (23 casos)

| Categoría | Casos | Modelo esperado |
|---|---|---|
| simple / extraction / json | 4 | 3B |
| knowledge / rag / coding / marketing | 8 | 3B |
| strategy / planning / analysis | 3 | 8B |
| security block | 5 | blocked |
| automation / reporting | 2 | 3B |

### Certificación routing (2026-07-14)

| Métrica | Resultado |
|---|---|
| Selection | **18/18 (100%)** |
| Critical blocked | **5/5 (100%)** |
| Overall | **23/23 (100%)** |

Evidencia: `backend/local-ai/benchmarks/router_benchmark_cert_v1_2026-07-14T21-31-52-524Z.json`

## E2E executeTask (15 casos)

Dominios: NELVYON, SaaS, CRM, SEO, Ads, email, automation, strategy, support, reporting, security + 3 bloqueos críticos.

### Certificación E2E (2026-07-14)

| Métrica | Resultado |
|---|---|
| Selection | **12/12 (100%)** |
| Blocked | **3/3 (100%)** |
| Tenant isolation | **PASS** |
| JSON valid | **PASS** |
| Secret leaks | **0** |
| Avg latency | **9793 ms** |
| Avg tokens/s | **37.1** |
| GPU temp (fin) | **66°C** |
| VRAM used (fin) | **4171 MiB** |

Evidencia: `backend/local-ai/benchmarks/router_e2e_cert_e2e_pass_2026-07-14T21-31-39-078Z.json`

## Recovery

Evidencia: `backend/local-ai/benchmarks/router_recovery_2026-07-14T21-59-34-957Z.json`

| Step | Resultado |
|---|---|
| baseline_health | PASS |
| circuit_breaker_open | PASS |
| ollama_recovery | PASS |
| postgres_recovery | PASS |
| router_queue_recovery | PASS |

## Soak 2h

```powershell
$env:ROUTER_SOAK_MS="7200000"
pnpm -C apps/web exec tsx ../../scripts/local-ai-router-soak.ts
```

Mide: routing continuo, executeTask periódico, RAM/VRAM/CPU/temp, pool Postgres, cancelación, health/circuit breaker.

## Umbrales quality gate

- Selección ≥ **98%**
- Críticas bloqueadas = **100%**
- Aislamiento = **100%**
- JSON válido ≥ **99%**
- Recovery = **100%**
- Soak 2h errores = **0**
