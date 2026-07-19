# PHASE2_ARCHITECTURE — SSOT IA (nota workforce)

> Complementa `docs/PHASE2_AI_ARCHITECTURE.md` (stack local Ollama/pgvector) y `docs/PHASE2_ORCHESTRATOR.md`.  
> Actualizado **2026-07-19**.

---

## SSOT compartido

La fuerza de trabajo autónoma (Bloques A–H) **reutiliza el mismo SSOT de Fase 2** — no introduce un registro paralelo de agentes permanentes:

| Capa | Path |
|------|------|
| Unified Registry | `backend/agents/AgentRegistry.ts` |
| Private AI defs | `backend/private-ai/nelvyonAgentRegistry.ts` (~23 runtime) |
| Orchestrator | `backend/orchestrator/*` (+ `OrchestratorDaemon`, persist) |
| MCP bridge | `backend/private-ai/tools/toolIdMap.ts` → `backend/mcp/**` |
| RAG / Memory | Unified RAG + Shared Memory (flags) |
| Prompts | `PromptRegistry` + system prompts agentes |
| Evals / improvement | `agentEvalSuite` · `controlledImprovement` · canary |

Workforce añade **metadata** (hierarchy, lifecycle, workflow catalog, leaderboard, canary) sobre esos IDs.

---

## Qué no entra en el SSOT Unified

- **~1634** OS pack agents — stack packs; no import  
- **14** Autonomous roles — prompts paralelos SKU; keep separate  

---

## Freeze

Router / MCP / Specialization / Phase 2 Elite PASS permanecen intactos.  
Workforce cert = **CONDITIONAL_PASS** independiente (`nelvyonAutonomousWorkforceCertified=false`).
