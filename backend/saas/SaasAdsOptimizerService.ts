import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

export type AdsOptimizerRule = {
  id: string;
  platform: string;
  name: string;
  conditionJson: Record<string, unknown>;
  actionJson: Record<string, unknown>;
  enabled: boolean;
  lastRunAt: string | null;
};

export class SaasAdsOptimizerService {
  constructor(private readonly deps: { db?: Pick<DbClient, "query"> } = {}) {}
  private get db() { return this.deps.db ?? DbClientClass.getInstance(); }

  async listRules(tenantId: string): Promise<AdsOptimizerRule[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT id, platform, name, condition_json, action_json, enabled, last_run_at
       FROM saas_ads_optimizer_rules WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(mapRule);
  }

  async upsertRule(tenantId: string, input: Omit<AdsOptimizerRule, "id" | "lastRunAt"> & { id?: string }): Promise<AdsOptimizerRule> {
    if (input.id) {
      const rows = await this.db.query<Record<string, unknown>>(
        `UPDATE saas_ads_optimizer_rules SET platform=$3, name=$4, condition_json=$5, action_json=$6, enabled=$7
         WHERE id=$1 AND tenant_id=$2
         RETURNING id, platform, name, condition_json, action_json, enabled, last_run_at`,
        [input.id, tenantId, input.platform, input.name, JSON.stringify(input.conditionJson), JSON.stringify(input.actionJson), input.enabled],
      );
      return mapRule(rows[0]!);
    }
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_ads_optimizer_rules (tenant_id, platform, name, condition_json, action_json, enabled)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, platform, name, condition_json, action_json, enabled, last_run_at`,
      [tenantId, input.platform, input.name, JSON.stringify(input.conditionJson), JSON.stringify(input.actionJson), input.enabled],
    );
    return mapRule(rows[0]!);
  }

  /** Evaluate rules against latest ROAS metrics — returns actions to apply. */
  async evaluateRules(tenantId: string, metrics: { platform: string; roas: number; spend: number; campaignId?: string }[]): Promise<Array<{ ruleId: string; action: string; detail: Record<string, unknown> }>> {
    const rules = (await this.listRules(tenantId)).filter((r) => r.enabled);
    const out: Array<{ ruleId: string; action: string; detail: Record<string, unknown> }> = [];
    for (const rule of rules) {
      const cond = rule.conditionJson;
      const minRoas = Number(cond.min_roas ?? 0);
      const maxSpend = Number(cond.max_spend ?? Infinity);
      for (const m of metrics.filter((x) => x.platform === rule.platform)) {
        if (m.roas < minRoas || m.spend > maxSpend) {
          out.push({
            ruleId: rule.id,
            action: String(rule.actionJson.type ?? "pause"),
            detail: { ...rule.actionJson, campaignId: m.campaignId, roas: m.roas, spend: m.spend },
          });
        }
      }
    }
    await this.db.query(
      `UPDATE saas_ads_optimizer_rules SET last_run_at=NOW() WHERE tenant_id=$1 AND enabled=true`,
      [tenantId],
    );
    return out;
  }
}

function mapRule(r: Record<string, unknown>): AdsOptimizerRule {
  return {
    id: String(r.id),
    platform: String(r.platform),
    name: String(r.name),
    conditionJson: (r.condition_json ?? {}) as Record<string, unknown>,
    actionJson: (r.action_json ?? {}) as Record<string, unknown>,
    enabled: Boolean(r.enabled),
    lastRunAt: r.last_run_at != null ? String(r.last_run_at) : null,
  };
}

let _svc: SaasAdsOptimizerService | undefined;
export function getSaasAdsOptimizerService(): SaasAdsOptimizerService {
  if (!_svc) _svc = new SaasAdsOptimizerService();
  return _svc;
}
