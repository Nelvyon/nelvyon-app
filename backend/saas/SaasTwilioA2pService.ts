import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type A2pRegistration = {
  id: string;
  businessName: string;
  ein: string | null;
  useCase: string | null;
  brandSid: string | null;
  campaignSid: string | null;
  status: string;
};

export class SaasTwilioA2pService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async list(tenantId: string): Promise<A2pRegistration[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, business_name, ein, use_case, brand_sid, campaign_sid, status
       FROM saas_twilio_a2p_registrations WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map((r) => ({
      id: String(r.id),
      businessName: String(r.business_name),
      ein: r.ein != null ? String(r.ein) : null,
      useCase: r.use_case != null ? String(r.use_case) : null,
      brandSid: r.brand_sid != null ? String(r.brand_sid) : null,
      campaignSid: r.campaign_sid != null ? String(r.campaign_sid) : null,
      status: String(r.status),
    }));
  }

  async createDraft(tenantId: string, input: { businessName: string; ein?: string; useCase?: string }): Promise<A2pRegistration> {
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_twilio_a2p_registrations (tenant_id, business_name, ein, use_case, status)
       VALUES ($1,$2,$3,$4,'draft') RETURNING id, business_name, ein, use_case, brand_sid, campaign_sid, status`,
      [tenantId, input.businessName, input.ein ?? null, input.useCase ?? null],
    );
    const r = rows[0]!;
    return {
      id: String(r.id),
      businessName: String(r.business_name),
      ein: r.ein != null ? String(r.ein) : null,
      useCase: r.use_case != null ? String(r.use_case) : null,
      brandSid: null,
      campaignSid: null,
      status: String(r.status),
    };
  }
}

let _svc: SaasTwilioA2pService | undefined;
export function getSaasTwilioA2pService(): SaasTwilioA2pService {
  if (!_svc) _svc = new SaasTwilioA2pService();
  return _svc;
}
