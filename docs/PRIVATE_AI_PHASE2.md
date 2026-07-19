# Fase 2 — IA privada Nelvyon

> **Ver:** [PRIVATE_AI_ARCHITECTURE.md](./PRIVATE_AI_ARCHITECTURE.md) · [PHASE2_PREP_INDEX.md](./PHASE2_PREP_INDEX.md)

Estado **2026-07-17**: runtime integrado (Shared Memory, RAG facade, OpenClaw HTTP gated, Context Engine, Metrics, Orchestrator, Panel).

Default fail-closed: `NELVYON_AI_ENABLED=0`, Memory/Orch/OpenClaw flags OFF.

Certificaciones intactas: Router · MCP Productivo · Specialization.

## SSOT

| Capacidad | Fuente |
|-----------|--------|
| Inferencia local | `LocalModelRouter` / `OllamaClient` |
| RAG Private AI | `UnifiedRagStore` (ADR-025) |
| Memoria multi-agente | Shared Memory (mig 514) |
| Memoria inbox | `SaasTenantMemoryService` (adjunct) |
| MCP | Productivo `/api/saas/mcp` (legacy `NelvyonMcpService` deprecated) |
| OpenClaw | `HttpOpenClawBridge` si Memory+flag+URL; delegate opcional `NELVYON_OPENCLAW_DELEGATE=1` |

## Activación ops

Ver `docs/HANDOVER.md` y `.env.example` (bloque Fase 2).
