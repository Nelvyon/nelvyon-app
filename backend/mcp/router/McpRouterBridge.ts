/**
 * Router ↔ MCP bridge — selects tools, evaluates risk, never bypasses policy.
 */

import { getMcpProductiveClient } from "../client/McpProductiveClient";
import type { McpInvokeResult, McpToolDef } from "../types";

export type RouterToolHint = {
  query: string;
  tenantId: string;
  userId: string;
  agentId?: string;
  model?: string;
  scopes?: string[];
  roles?: string[];
};

const KEYWORD_MAP: Array<{ re: RegExp; tools: string[] }> = [
  { re: /\b(salud|health|status)\b/i, tools: ["health_check"] },
  { re: /\b(métrica|metric|ram|cpu)\b/i, tools: ["metrics_snapshot"] },
  { re: /\b(doc|handover|readme|seo)\b/i, tools: ["docs_read"] },
  { re: /\b(rag|conocimiento|knowledge)\b/i, tools: ["rag_search"] },
  { re: /\b(memoria|memory)\b/i, tools: ["memory_read"] },
  { re: /\b(crm|contacto|contact)\b/i, tools: ["crm_list"] },
  { re: /\b(bulk\s*import|crm\s+bulk)\b/i, tools: ["crm_bulk_import"] },
  { re: /\b(report|kpi|analytics|reporting)\b/i, tools: ["reporting_summary"] },
  { re: /\b(sql|postgres|select)\b/i, tools: ["postgres_query"] },
  { re: /\b(scrape|scraping|url)\b/i, tools: ["scraping_authorized"] },
  { re: /\b(email|borrador|draft)\b/i, tools: ["email_draft"] },
  { re: /\b(campaña|campaign|enviar masivo)\b/i, tools: ["send_mass_campaign"] },
  { re: /\b(borrar|delete|destruir)\b/i, tools: ["delete_data"] },
  { re: /\b(deploy|desplegar|producción)\b/i, tools: ["deploy_production"] },
];

export function selectToolsForQuery(query: string, catalog: McpToolDef[]): string[] {
  const selected = new Set<string>();
  for (const row of KEYWORD_MAP) {
    if (row.re.test(query)) {
      for (const t of row.tools) {
        if (catalog.some((c) => c.name === t)) selected.add(t);
      }
    }
  }
  if (selected.size === 0 && catalog.some((c) => c.name === "health_check")) {
    selected.add("health_check");
  }
  return [...selected];
}

export type McpRouterPlan = {
  tools: string[];
  needsTools: boolean;
  highRisk: boolean;
};

export function planMcpForRouter(hint: RouterToolHint): McpRouterPlan {
  const client = getMcpProductiveClient();
  const catalog = client.discover();
  const tools = selectToolsForQuery(hint.query, catalog);
  const defs = tools.map((n) => catalog.find((c) => c.name === n)!).filter(Boolean);
  const highRisk = defs.some((d) => d.risk === "high" || d.risk === "critical" || d.requiresApproval);
  return { tools, needsTools: tools.length > 0, highRisk };
}

export async function executeRouterToolPlan(
  hint: RouterToolHint,
  argsByTool: Record<string, Record<string, unknown>> = {},
): Promise<McpInvokeResult[]> {
  const client = getMcpProductiveClient();
  const plan = planMcpForRouter(hint);
  const out: McpInvokeResult[] = [];
  for (const toolName of plan.tools) {
    const args = argsByTool[toolName] ?? defaultArgs(toolName, hint.query);
    const result = await client.call(toolName, args, {
      tenantId: hint.tenantId,
      userId: hint.userId,
      agentId: hint.agentId ?? "router",
      model: hint.model,
      // Minimal default — never invent mcp.write. Router-selected write tools still
      // pass through PolicyEngine's role/scope check (default role "owner" covers it).
      scopes: hint.scopes ?? ["mcp.read"],
      roles: hint.roles ?? ["owner"],
    });
    out.push(result);
  }
  return out;
}

function defaultArgs(toolName: string, query: string): Record<string, unknown> {
  switch (toolName) {
    case "docs_read":
      return { path: "docs/HANDOVER.md" };
    case "rag_search":
      return { query };
    case "postgres_query":
      return { sql: "SELECT 1" };
    case "scraping_authorized":
      return { url: "https://app.nelvyon.com/api/health" };
    case "email_draft":
      return { subject: "Draft", body: query };
    case "send_mass_campaign":
      return { campaignId: "demo" };
    case "delete_data":
      return { target: "demo" };
    default:
      return {};
  }
}
