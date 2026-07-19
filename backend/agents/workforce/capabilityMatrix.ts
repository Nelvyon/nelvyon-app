/**
 * Capability × agent matrix aligned with allowedTools (SSOT).
 */

import { NELVYON_PRIVATE_AGENTS } from "../../private-ai/nelvyonAgentRegistry";
import type { AgentToolId } from "../../private-ai/types";
import { AGENT_TO_MCP_EXPORT } from "../../private-ai/tools/toolIdMap";

export type CapabilityId =
  | "crm"
  | "seo"
  | "content"
  | "campaigns"
  | "ads_planning"
  | "engineering"
  | "security"
  | "finance"
  | "support"
  | "ops"
  | "product"
  | "reporting"
  | "memory"
  | "rag";

const CAPABILITY_TOOLS: Record<CapabilityId, AgentToolId[]> = {
  crm: ["crm.read", "crm.write"],
  seo: ["reports.read", "rag.search", "memory.read"],
  content: ["memory.read", "rag.search", "reports.read"],
  campaigns: ["campaigns.draft", "campaigns.send"],
  ads_planning: ["memory.read", "reports.read", "rag.search"],
  engineering: ["rag.search", "memory.read", "audit.read", "reports.read"],
  security: ["audit.read", "rag.search", "integrations.read"],
  finance: ["reports.read", "billing.read", "memory.read"],
  support: ["memory.read", "rag.search", "reports.read", "inbox.suggest"],
  ops: ["workflows.read", "workflows.execute", "memory.read", "audit.read"],
  product: ["memory.read", "rag.search", "reports.read"],
  reporting: ["reports.read", "memory.read"],
  memory: ["memory.read", "memory.write"],
  rag: ["rag.search"],
};

export function agentCapabilities(agentId: string): CapabilityId[] {
  const agent = NELVYON_PRIVATE_AGENTS.find((a) => a.id === agentId);
  if (!agent) return [];
  const caps: CapabilityId[] = [];
  for (const [cap, tools] of Object.entries(CAPABILITY_TOOLS) as [CapabilityId, AgentToolId[]][]) {
    if (tools.some((t) => agent.allowedTools.includes(t))) caps.push(cap);
  }
  return caps;
}

export function capabilityMatrixSnapshot() {
  const rows = NELVYON_PRIVATE_AGENTS.map((a) => ({
    agentId: a.id,
    allowedTools: [...a.allowedTools],
    capabilities: agentCapabilities(a.id),
    mcpMappedTools: a.allowedTools
      .map((t) => ({ tool: t, mcp: AGENT_TO_MCP_EXPORT[t] ?? null }))
      .filter((x) => x.mcp),
  }));
  const unmapped = new Set<string>();
  for (const a of NELVYON_PRIVATE_AGENTS) {
    for (const t of a.allowedTools) {
      if (!AGENT_TO_MCP_EXPORT[t]) unmapped.add(t);
    }
  }
  return {
    agents: rows.length,
    rows,
    unmappedTools: [...unmapped].sort(),
  };
}
