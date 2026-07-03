/**
 * S58 — Nelvyon MCP tool registry (HTTP bridge for MCP clients).
 * Maps tool names → existing SaaS services.
 */
import { createHash } from "node:crypto";
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { getSaasCrmService } from "./SaasCrmService";
import { getSaasDealsService } from "./SaasDealsService";
import { getSaasInboxAgentService } from "./SaasInboxAgentService";
import { getSaasBriefToLaunchService } from "./SaasBriefToLaunchService";

export type McpToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export const MCP_TOOLS: McpToolDef[] = [
  {
    name: "crm_list_contacts",
    description: "List CRM contacts for the tenant",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "crm_create_contact",
    description: "Create a CRM contact",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" } },
    },
  },
  {
    name: "pipeline_list_deals",
    description: "List pipeline deals",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "inbox_suggest_reply",
    description: "Suggest an AI reply for an inbox conversation",
    inputSchema: {
      type: "object",
      required: ["conversationId"],
      properties: { conversationId: { type: "string" }, tone: { type: "string" } },
    },
  },
  {
    name: "pack_kickoff",
    description: "Launch a growth pack via brief-to-launch",
    inputSchema: {
      type: "object",
      required: ["packId", "businessName"],
      properties: {
        packId: { type: "string" },
        businessName: { type: "string" },
        sector: { type: "string" },
      },
    },
  },
];

export class NelvyonMcpService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  listTools(): McpToolDef[] {
    return MCP_TOOLS;
  }

  async invokeTool(
    tenantId: string,
    userId: string,
    toolName: string,
    args: Record<string, unknown>,
    apiKeyId?: string,
  ): Promise<{ ok: boolean; result?: unknown; error?: string }> {
    const start = Date.now();
    let ok = true;
    let error: string | undefined;
    let result: unknown;

    try {
      switch (toolName) {
        case "crm_list_contacts": {
          const contacts = await getSaasCrmService().getContacts(tenantId);
          const limit = Number(args.limit ?? 25);
          result = contacts.slice(0, limit);
          break;
        }
        case "crm_create_contact": {
          result = await getSaasCrmService().createContact(tenantId, {
            name: String(args.name ?? ""),
            email: args.email != null ? String(args.email) : undefined,
            phone: args.phone != null ? String(args.phone) : undefined,
          });
          break;
        }
        case "pipeline_list_deals": {
          result = await getSaasDealsService().listDeals(tenantId);
          break;
        }
        case "inbox_suggest_reply": {
          result = await getSaasInboxAgentService().suggestReply(
            tenantId,
            String(args.conversationId ?? ""),
            args.tone != null ? String(args.tone) : undefined,
          );
          break;
        }
        case "pack_kickoff": {
          const svc = getSaasBriefToLaunchService();
          const launch = await svc.createLaunch(tenantId, {
            packId: String(args.packId ?? "local-business-growth"),
            brief: {
              business_name: String(args.businessName ?? ""),
              sector: String(args.sector ?? "general"),
            },
            userId,
          });
          result = launch;
          break;
        }
        default:
          ok = false;
          error = `Unknown tool: ${toolName}`;
      }
    } catch (e) {
      ok = false;
      error = e instanceof Error ? e.message : "tool error";
    }

    const latencyMs = Date.now() - start;
    await this.audit(tenantId, apiKeyId, toolName, args, latencyMs, ok, error).catch(() => {});

    return ok ? { ok: true, result } : { ok: false, error };
  }

  private async audit(
    tenantId: string,
    apiKeyId: string | undefined,
    toolName: string,
    args: Record<string, unknown>,
    latencyMs: number,
    success: boolean,
    errorCode?: string,
  ): Promise<void> {
    const argsHash = createHash("sha256").update(JSON.stringify(args)).digest("hex").slice(0, 16);
    await this.db.query(
      `INSERT INTO saas_mcp_tool_audit (tenant_id, api_key_id, tool_name, args_hash, latency_ms, success, error_code)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, $7)`,
      [tenantId, apiKeyId ?? null, toolName, argsHash, latencyMs, success, errorCode ?? null],
    ).catch(() => {});
  }
}

let _svc: NelvyonMcpService | undefined;
export function getNelvyonMcpService(): NelvyonMcpService {
  _svc ??= new NelvyonMcpService();
  return _svc;
}
export function resetNelvyonMcpServiceForTests(): void {
  _svc = undefined;
}
