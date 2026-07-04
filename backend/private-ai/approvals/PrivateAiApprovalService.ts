import { DbClient } from "../../db/DbClient";
import type { SaasPostgresPort } from "../../saas/SaasOnboardingService";
import type { SensitiveActionType } from "../types";

export class PrivateAiApprovalService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async queue(input: {
    tenantId: string;
    agentId: string;
    actionType: SensitiveActionType;
    payload: Record<string, unknown>;
    requestedBy?: string;
  }): Promise<string> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_private_ai_approvals (tenant_id, agent_id, action_type, payload, requested_by, expires_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, NOW() + INTERVAL '7 days')
       RETURNING id`,
      [
        input.tenantId,
        input.agentId,
        input.actionType,
        JSON.stringify(input.payload),
        input.requestedBy ?? null,
      ],
    );
    return rows[0]?.id ?? "";
  }

  async list(tenantId: string, status = "pending") {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, agent_id, action_type, payload, status, requested_by, reviewed_by,
              review_note, reviewed_at, expires_at, created_at
       FROM saas_private_ai_approvals
       WHERE tenant_id = $1 AND status = $2
       ORDER BY created_at DESC LIMIT 50`,
      [tenantId, status],
    );
    return rows.map((r) => ({
      id: String(r.id),
      agentId: String(r.agent_id),
      actionType: String(r.action_type),
      payload: r.payload,
      status: String(r.status),
      requestedBy: r.requested_by != null ? String(r.requested_by) : null,
      createdAt: String(r.created_at),
    }));
  }

  async review(
    tenantId: string,
    approvalId: string,
    reviewerId: string,
    decision: "approved" | "rejected",
    note?: string,
  ): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_private_ai_approvals
       SET status = $3, reviewed_by = $4, review_note = $5, reviewed_at = NOW()
       WHERE id = $2 AND tenant_id = $1 AND status = 'pending'
       RETURNING id`,
      [tenantId, approvalId, decision, reviewerId, note ?? null],
    );
    return rows.length > 0;
  }
}

let _svc: PrivateAiApprovalService | undefined;
export function getPrivateAiApprovalService(): PrivateAiApprovalService {
  _svc ??= new PrivateAiApprovalService();
  return _svc;
}
