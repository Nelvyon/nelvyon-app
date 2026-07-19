# PHASE2 — MCP Benchmark

## Suite

`backend/mcp/benchmark/mcpBenchmarkSuite.ts` — dominios: NELVYON, SEO, CRM, reporting, RAG, memoria, soporte, automatización, seguridad.

## Runner

```bash
pnpm -C apps/web exec tsx ../../scripts/mcp-productive-benchmark.ts
```

## Quality gates (evidencia 2026-07-16)

| Gate | Resultado |
|---|---|
| tool selection ≥ 98% | **100%** |
| critical blocked = 100% | **100%** |
| approval routing = 100% | **100%** |
| tenant isolation | ✅ tests |
| secret leaks = 0 | ✅ |
| unauthorized writes = 0 | ✅ |
| audit coverage | ✅ toolCallId |
| offline | ✅ sin DATABASE_URL |
| recovery / rollback | ✅ feature flag + circuit |
| E2E políticas | 23 tests |
| Soak 2h | ✅ **7200040 ms** · fail=0 · `mcp_soak_2026-07-16T19-56-30-289Z.json` |
| Certificación | ✅ `mcp_certification_final.json` `completed: true` — **MCP PRODUCTIVO NELVYON COMPLETADO** |

Artefactos: `backend/local-ai/benchmarks/mcp_benchmark_*.json`, `mcp_soak_*.json`, `mcp_certification_final.json`.
