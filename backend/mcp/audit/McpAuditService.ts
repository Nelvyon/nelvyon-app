import { createHash, randomUUID } from "node:crypto";
import type { SaasPostgresPort } from "../../saas/SaasOnboardingService";
import type { McpAuditRecord, McpInvokeResult } from "../types";
import { avisoSeguro } from "../../seguridad/avisoSeguro";

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
      // `retries` es cuantas veces se REINTENTO; el intento es uno mas. Sin
      // esto, algo que funciono a la tercera y algo que funciono a la primera
      // dejan la misma fila.
      attempt: (result.retries ?? 0) + 1,
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
           (tenant_id, api_key_id, tool_name, args_hash, latency_ms, success, error_code,
            agent_id, user_id, decision, risk, approval_id, request_id, trace_id,
            attempt, cost_estimate_usd)
         VALUES ($1, $2::uuid, $3, $4, $5, $6, $7,
                 $8, $9, $10, $11, $12, $13, $14,
                 $15, $16)`,
        [
          record.tenantId,
          apiKeyId ?? null,
          record.toolName,
          record.argsHash,
          record.durationMs,
          record.ok,
          record.errorCode ?? record.decision,
          // Todo esto YA venia en el registro y se tiraba al persistir. Sin
          // ello no se puede reconstruir quien hizo que, con que permiso, en
          // que intento y con que aprobacion.
          record.agentId,
          record.userId,
          record.decision,
          record.risk,
          record.approvalId ?? null,
          record.requestId,
          record.traceId,
          record.attempt ?? null,
          // `null` significa NO SE SABE. Un 0 significaria que fue gratis, y
          // eso es una afirmacion distinta que aqui no se puede hacer.
          record.costEstimateUsd ?? null,
        ],
      )
      // Un fallo al auditar no puede tumbar la ejecucion, pero tampoco puede
      // desaparecer: perder auditoria en silencio es perder la unica prueba de
      // lo que paso. Se cuenta redactado, sin el DSN que trae el error dentro.
      .catch((e: unknown) => {
        avisoSeguro("McpAuditService", `no se pudo auditar ${record.toolName}`, e);
      });
    return id;
  }
}
