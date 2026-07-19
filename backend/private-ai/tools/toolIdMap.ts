/**
 * Map Private AI dotted tool IDs ↔ MCP productive snake_case names (SSOT bridge).
 * Only maps tools that exist in productiveTools.ts.
 */

import type { AgentToolId } from "../types";

const AGENT_TO_MCP: Partial<Record<AgentToolId, string>> = {
  "memory.read": "memory_read",
  "memory.write": "memory_write",
  "rag.search": "rag_search",
  "crm.read": "crm_list",
  "crm.write": "crm_upsert_contact",
  "audit.read": "logs_tail",
  "reports.read": "reporting_summary",
  "campaigns.draft": "email_draft",
  "campaigns.send": "send_mass_campaign",
  "integrations.read": "docs_read",
  "billing.read": "reporting_summary",
  "inbox.suggest": "email_draft",
  "workflows.read": "docs_read",
};

const MCP_TO_AGENT: Record<string, AgentToolId> = Object.fromEntries(
  Object.entries(AGENT_TO_MCP).map(([k, v]) => [v!, k as AgentToolId]),
) as Record<string, AgentToolId>;

export function agentToolToMcp(toolId: AgentToolId): string | null {
  return AGENT_TO_MCP[toolId] ?? null;
}

export function mcpToolToAgent(name: string): AgentToolId | null {
  return MCP_TO_AGENT[name] ?? null;
}

export function listMappedAgentTools(): AgentToolId[] {
  return Object.keys(AGENT_TO_MCP) as AgentToolId[];
}

/** Read-only snapshot for capability matrix / docs. */
export const AGENT_TO_MCP_EXPORT: Partial<Record<AgentToolId, string>> = { ...AGENT_TO_MCP };
