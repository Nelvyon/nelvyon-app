import { createHash, randomUUID } from "node:crypto";
import type { SaasPostgresPort } from "../../saas/SaasOnboardingService";
import type { McpAuditRecord, McpInvokeResult } from "../types";

export class McpAuditService {
  constructor(private readonly db?: SaasPostgresPort) {}

  hashArgs(args: Record<string, unknown>): string {
    return createHash("sha256").update(JSON.stringify(args)).digest("hex").slice(0, 16);
  }

  buildRecord(
    result: McpInvokeResult,
    ctx: {
      tenantId: string;
      userId: string;
      agentId: string;
      requestId: string;
      traceId: string;
      model?: string;
    },
  ): McpAuditRecord {
    return {
      toolCallId: result.toolCallId,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      agentId: ctx.agentId,
      toolName: result.toolName,
      risk: result.risk,
      decision: result.decision,
      durationMs: result.durationMs,
      ok: result.ok,
      errorCode: result.errorCode,
      approvalId: result.approvalId,
      model: ctx.model,
      requestId: ctx.requestId,
      traceId: ctx.traceId,
      argsHash: this.hashArgs(result.sanitizedArgs),
    };
  }

  async persist(record: McpAuditRecord, apiKeyId?: string): Promise<string> {
    const id = record.toolCallId || randomUUID();
    if (!this.db) return id;
    await this.db
      .query(
        `INSERT INTO saas_mcp_tool_audit
           (tenant_id, api_key_id, tool_name, args_hash, latency_ms, success, error_code)
         VALUES ($1, $2::uuid, $3, $4, $5, $6, $7)`,
        [
          record.tenantId,
          apiKeyId ?? null,
          record.toolName,
          record.argsHash,
          record.durationMs,
          record.ok,
          record.errorCode ?? record.decision,
        ],
      )
      .catch(() => {});
    return id;
  }
}
