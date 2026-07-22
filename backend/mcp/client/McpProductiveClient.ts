/**
 * MCP Productive Client — typed discovery + invoke for Router / SaaS.
 */

import { randomUUID } from "node:crypto";
import { getMcpProductiveServer, type McpProductiveServer } from "../server/McpProductiveServer";
import type { McpCallContext, McpInvokeResult, McpToolDef } from "../types";
import type { SaasPostgresPort } from "../../saas/SaasOnboardingService";

export type McpClientOptions = {
  tenantId: string;
  userId: string;
  agentId?: string;
  roles?: string[];
  scopes?: string[];
  model?: string;
};

export class McpProductiveClient {
  private readonly server: McpProductiveServer;

  constructor(db?: SaasPostgresPort) {
    this.server = getMcpProductiveServer(db);
  }

  discover(): McpToolDef[] {
    return this.server.listTools();
  }

  health() {
    return this.server.health();
  }

  private ctx(opts: McpClientOptions, idempotencyKey?: string): McpCallContext {
    return {
      tenantId: opts.tenantId,
      userId: opts.userId,
      agentId: opts.agentId ?? "mcp_client",
      requestId: randomUUID(),
      traceId: randomUUID(),
      roles: opts.roles ?? ["member"],
      scopes: opts.scopes ?? ["mcp.read"],
      model: opts.model,
      idempotencyKey,
    };
  }

  async call(
    toolName: string,
    args: Record<string, unknown>,
    opts: McpClientOptions,
    extra?: { timeoutMs?: number; dryRun?: boolean; idempotencyKey?: string; signal?: AbortSignal },
  ): Promise<McpInvokeResult> {
    return this.server.invoke(
      {
        toolName,
        args,
        ctx: this.ctx(opts, extra?.idempotencyKey),
        timeoutMs: extra?.timeoutMs,
        dryRun: extra?.dryRun,
      },
      extra?.signal,
    );
  }
}

let _client: McpProductiveClient | undefined;
export function getMcpProductiveClient(db?: SaasPostgresPort): McpProductiveClient {
  _client ??= new McpProductiveClient(db);
  return _client;
}
export function resetMcpProductiveClientForTests(): void {
  _client = undefined;
}
