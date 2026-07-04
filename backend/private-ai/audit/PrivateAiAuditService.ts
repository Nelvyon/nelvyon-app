import { createHash } from "node:crypto";
import { DbClient } from "../../db/DbClient";
import type { SaasPostgresPort } from "../../saas/SaasOnboardingService";

function clip(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function hashPrompt(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export type AuditEntry = {
  tenantId: string;
  userId?: string;
  agentId: string;
  action: string;
  provider: string;
  model: string;
  prompt: string;
  userInput: string;
  output: string;
  metadata?: Record<string, unknown>;
};

export class PrivateAiAuditService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async log(entry: AuditEntry): Promise<string> {
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO saas_private_ai_audit
         (tenant_id, user_id, agent_id, action, provider, model, prompt_hash, input_preview, output_preview, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       RETURNING id`,
      [
        entry.tenantId,
        entry.userId ?? null,
        entry.agentId,
        entry.action,
        entry.provider,
        entry.model,
        hashPrompt(entry.prompt),
        clip(entry.userInput, 500),
        clip(entry.output, 800),
        JSON.stringify(entry.metadata ?? {}),
      ],
    );
    return rows[0]?.id ?? "";
  }

  async listRecent(tenantId: string, limit = 25) {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, agent_id, action, provider, model, input_preview, output_preview, created_at
       FROM saas_private_ai_audit WHERE tenant_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    return rows.map((r) => ({
      id: String(r.id),
      agentId: String(r.agent_id),
      action: String(r.action),
      provider: String(r.provider),
      model: r.model != null ? String(r.model) : null,
      inputPreview: String(r.input_preview ?? ""),
      outputPreview: String(r.output_preview ?? ""),
      createdAt: String(r.created_at),
    }));
  }
}

let _svc: PrivateAiAuditService | undefined;
export function getPrivateAiAuditService(): PrivateAiAuditService {
  _svc ??= new PrivateAiAuditService();
  return _svc;
}
