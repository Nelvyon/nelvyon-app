/**
 * Bridges MCP approval_required → saas_private_ai_approvals persistence.
 * Offline-safe: in-memory queue when no DB port is provided.
 */

import { randomUUID } from "node:crypto";
import { PrivateAiApprovalService } from "../../private-ai/approvals/PrivateAiApprovalService";
import type { SaasPostgresPort } from "../../saas/SaasOnboardingService";
import type { McpApprovalPayload, McpRiskLevel } from "../types";
import { getMcpApprovalTtlHours } from "../config";

const memoryApprovals: Array<{ id: string; payload: McpApprovalPayload }> = [];

export class McpApprovalBridge {
  private readonly approvals: PrivateAiApprovalService | null;

  constructor(db?: SaasPostgresPort) {
    this.approvals = db ? new PrivateAiApprovalService(db) : null;
  }

  async queue(payload: McpApprovalPayload): Promise<string> {
    if (!this.approvals) {
      const id = payload.actionId || randomUUID();
      memoryApprovals.push({ id, payload });
      return id;
    }
    const actionType =
      payload.risk === "critical" ? "touch_production" : "change_critical_integration";
    return this.approvals.queue({
      tenantId: payload.tenantId,
      agentId: payload.agentId,
      actionType,
      requestedBy: payload.userId,
      payload: {
        source: "mcp_productive",
        actionId: payload.actionId,
        toolName: payload.toolName,
        args: payload.args,
        reason: payload.reason,
        risk: payload.risk as McpRiskLevel,
        requestId: payload.requestId,
        traceId: payload.traceId,
        expiresAt: payload.expiresAt,
        ttlHours: getMcpApprovalTtlHours(),
      },
    });
  }
}

export function resetMemoryApprovalsForTests(): void {
  memoryApprovals.length = 0;
}
