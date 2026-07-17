# PHASE2 — Orquestador

## Contratos

`backend/orchestrator/contracts.ts` + `runtime.ts` + `jobExecutor.ts`

- Estados: queued → running → waiting_approval/tool → succeeded/failed/cancelled/dead_letter
- Patrones: sequential, parallel_fanout, pipeline, supervisor_worker
- Resiliencia: concurrency, retries, circuit, checkpoint, recoverOnRestart
- Observabilidad: métricas + traces sin secretos
- **Ejecución:** `sandboxJobExecutor` (default) produce entregables estructurados y valida acceptance — **no** stubs `planned`
- Live (opt-in): `NELVYON_ORCHESTRATOR_LIVE=1` (Private AI) — **no** certificado elite aún

## Workflows enterprise

`backend/agents/workflows/` — 10 escenarios sandbox-certificables (ver `PHASE2_ELITE_CERT.md`).

## Feature flag

`NELVYON_ORCHESTRATOR_ENABLED=0` (default)

## Dependencias

MCP cert → Shared Memory → Orchestrator runtime
