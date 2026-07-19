/**
 * Optional MCP tool invoke from Private AI agent runs (flag-gated).
 * Reuses certified MCP ToolRegistry — does not duplicate tool implementations.
 */

import { getMcpProductiveClient } from "../../mcp/client/McpProductiveClient";
import { isMcpProductiveEnabled } from "../../mcp/config";
import type { AgentToolId } from "../types";
import { agentToolToMcp } from "./toolIdMap";

export function isPrivateAiMcpToolsEnabled(): boolean {
  if (!isMcpProductiveEnabled()) return false;
  const v = process.env.NELVYON_PRIVATE_AI_MCP_TOOLS ?? "1";
  return v === "1" || v.toLowerCase() === "true";
}

export async function invokeAgentToolViaMcp(opts: {
  toolId: AgentToolId;
  args: Record<string, unknown>;
  tenantId: string;
  userId: string;
  agentId: string;
  roles?: string[];
}): Promise<{ ok: boolean; toolName: string | null; result?: unknown; error?: string }> {
  const toolName = agentToolToMcp(opts.toolId);
  if (!toolName) {
    return { ok: false, toolName: null, error: "tool_not_mapped_to_mcp" };
  }
  if (!isPrivateAiMcpToolsEnabled()) {
    return { ok: false, toolName, error: "mcp_tools_disabled" };
  }
  try {
    const client = getMcpProductiveClient();
    const res = await client.call(toolName, opts.args, {
      tenantId: opts.tenantId,
      userId: opts.userId,
      agentId: opts.agentId,
      roles: opts.roles ?? ["member"],
      scopes: ["mcp.read", "memory.read", "memory.write"],
    });
    return {
      ok: res.ok,
      toolName,
      result: res.result,
      error: res.ok ? undefined : res.error ?? res.decision,
    };
  } catch (e) {
    return {
      ok: false,
      toolName,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
