# AGENT CAPABILITY MATRIX

> Dos matrices — no confundir.

---

## 1. Snapshot filas agente (docs / panel)

**Path:** `backend/agents/capabilityMatrix.ts`  
**Export:** `AGENT_CAPABILITY_MATRIX` + `capabilityMatrixSummary()`

Filas (~23) alineadas a Private AI runtime post-promoción: id, domain, `runtimeReady`, tools (labels), memory/rag flags, `evalCovered`, `workflowCovered`, notes.

Regla: **política ejecutable = `nelvyonAgentRegistry.allowedTools`**, no esta snapshot. Si divergen, gana el registry.

---

## 2. Capability × tools (workforce)

**Path:** `backend/agents/workforce/capabilityMatrix.ts`  
**API:** `agentCapabilities(agentId)`, `capabilityMatrixSnapshot()`

`CapabilityId`: `crm` · `seo` · `content` · `campaigns` · `ads_planning` · `engineering` · `security` · `finance` · `support` · `ops` · `product` · `reporting` · `memory` · `rag`

Cada capability → lista `AgentToolId[]`. Un agente “tiene” la capability si alguno de esos tools está en `allowedTools`.  
Snapshot también reporta `mcpMappedTools` vía `AGENT_TO_MCP_EXPORT` y `unmappedTools`.

---

## Leaderboard (métricas por capability)

`backend/agents/workforce/leaderboard.ts` — rankings **por capability**, sin score global engañoso.  
Capabilities métricas: `task_success`, `exactness`, `groundedness`, `hallucination_rate`, `tool_*`, `security`, `compliance`, `tenant_isolation`, `latency`, etc.

Panel: `GET /api/saas/ai-agents?resource=leaderboard&capability=task_success`

---

## Honestidad

- `runtimeReady=true` ≠ elite certified ≠ workforce certified  
- Varias filas pueden marcar `evalCovered: false` (p.ej. `product`, `operations`, `devops`, `social_media`) hasta ampliar suite  
- Ads: draft/plan only — no real spend
