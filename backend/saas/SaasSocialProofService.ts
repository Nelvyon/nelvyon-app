/**
 * S59 — Social proof drafts from approved deliverables (0€ templates).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { buildMockSocialPost, buildDeliverableSocialProofPost } from "./nelvyonAgentMockReplies";

export type SocialProofDraft = {
  id: string;
  tenantId: string;
  deliverableId: string | null;
  platform: string;
  content: string;
  hashtags: string[];
  status: "draft" | "scheduled" | "published";
  createdAt: string;
};

export class SaasSocialProofService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async createFromDeliverable(
    tenantId: string,
    input: { deliverableId?: string; title?: string; qaScore?: number; packName?: string; platform?: string },
  ): Promise<SocialProofDraft> {
    const draft = input.title
      ? buildDeliverableSocialProofPost(input)
      : buildMockSocialPost({ topic: input.packName, platform: input.platform });

    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_social_proof_drafts (tenant_id, deliverable_id, platform, content, hashtags)
       VALUES ($1, $2::uuid, $3, $4, $5)
       RETURNING *`,
      [
        tenantId,
        input.deliverableId ?? null,
        draft.platform,
        draft.content,
        draft.hashtags,
      ],
    );
    return this.mapRow(rows[0]!);
  }

  async list(tenantId: string, limit = 20): Promise<SocialProofDraft[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_social_proof_drafts WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    return rows.map((r) => this.mapRow(r));
  }

  private mapRow(r: Record<string, unknown>): SocialProofDraft {
    return {
      id: String(r.id),
      tenantId: String(r.tenant_id),
      deliverableId: r.deliverable_id != null ? String(r.deliverable_id) : null,
      platform: String(r.platform),
      content: String(r.content),
      hashtags: Array.isArray(r.hashtags) ? r.hashtags.map(String) : [],
      status: String(r.status) as SocialProofDraft["status"],
      createdAt: String(r.created_at),
    };
  }
}

let _svc: SaasSocialProofService | undefined;
export function getSaasSocialProofService(): SaasSocialProofService {
  _svc ??= new SaasSocialProofService();
  return _svc;
}
export function resetSaasSocialProofServiceForTests(): void {
  _svc = undefined;
}
