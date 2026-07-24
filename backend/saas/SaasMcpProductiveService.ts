/**
 * SaaS façade for MCP Productivo (tenant-scoped).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import {
  getMcpProductiveClient,
  getMcpProductiveServer,
  resetMcpProductiveClientForTests,
  resetMcpProductiveServerForTests,
} from "../mcp";
import type { McpInvokeResult, McpToolDef } from "../mcp/types";

export class SaasMcpProductiveService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  listTools(): McpToolDef[] {
    return getMcpProductiveServer(this.db).listTools();
  }

  health() {
    return getMcpProductiveServer(this.db).health();
  }

  async invoke(input: {
    tenantId: string;
    userId: string;
    agentId?: string;
    toolName: string;
    args?: Record<string, unknown>;
    roles?: string[];
    scopes?: string[];
    model?: string;
    idempotencyKey?: string;
    dryRun?: boolean;
  }): Promise<McpInvokeResult> {
    const client = getMcpProductiveClient(this.db);
    return client.call(input.toolName, input.args ?? {}, {
      tenantId: input.tenantId,
      userId: input.userId,
      agentId: input.agentId ?? "saas_mcp",
      roles: input.roles ?? ["member"],
      // Minimal default — never invent mcp.write. Callers must pass an explicit
      // scope claim when write access is genuinely authorized.
      scopes: input.scopes ?? ["mcp.read"],
      model: input.model,
    }, {
      dryRun: input.dryRun,
      idempotencyKey: input.idempotencyKey,
    });
  }
}

let _svc: SaasMcpProductiveService | undefined;
export function getSaasMcpProductiveService(): SaasMcpProductiveService {
  _svc ??= new SaasMcpProductiveService();
  return _svc;
}
export function resetSaasMcpProductiveServiceForTests(): void {
  _svc = undefined;
  resetMcpProductiveServerForTests();
  resetMcpProductiveClientForTests();
}
