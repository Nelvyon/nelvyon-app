import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import type { DealStage } from "./saasDealsDedupe";
import {
  buildDealDedupeKey,
  etlDealLegacySourceTag,
  mapLegacyDealStageToSaas,
  type DealEtlSource,
} from "./saasDealsDedupe";
import { etlLegacyIdTag, type EtlSource as ContactEtlSource } from "./saasCrmDedupe";

export type DealsEtlMode = "dry-run" | "apply";

/** `tenantId` acota el ETL al tenant autenticado (API). Sin valor = global (CLI ops). */
export type DealsEtlRunOptions = {
  tenantId?: string;
};

export type DealsEtlConflict = {
  dedupeKey: string;
  tenantId: string;
  sources: DealEtlSource[];
  legacyIds: string[];
  reason: string;
};

export type DealsEtlError = {
  source: DealEtlSource;
  legacyId: string;
  workspaceId: number | null;
  message: string;
};

export type SaasDealsEtlReport = {
  mode: DealsEtlMode;
  executedAt: string;
  candidatesTotal: number;
  newDeals: number;
  duplicates: number;
  conflicts: DealsEtlConflict[];
  errors: DealsEtlError[];
  skippedNoTenant: number;
  skippedNoContact: number;
  skippedAlreadyMigrated: number;
  bySource: Record<DealEtlSource, number>;
  appliedInserts: number;
};

type TenantMapRow = { id: string; workspace_id: number };

type DealCandidate = {
  source: DealEtlSource;
  legacyId: string;
  workspaceId: number;
  tenantId: string;
  contactId: string | null;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate: string | null;
  notes: string | null;
  sourceTag: string;
  dedupeKey: string;
};

export class SaasDealsEtlService {
  constructor(private readonly db: SaasPostgresPort) {}

  async run(mode: DealsEtlMode, options?: DealsEtlRunOptions): Promise<SaasDealsEtlReport> {
    const scopeTenantId = options?.tenantId?.trim() || null;
    const scopeWorkspaceId = scopeTenantId
      ? await this.resolveWorkspaceForTenant(scopeTenantId)
      : null;

    const report: SaasDealsEtlReport = {
      mode,
      executedAt: new Date().toISOString(),
      candidatesTotal: 0,
      newDeals: 0,
      duplicates: 0,
      conflicts: [],
      errors: [],
      skippedNoTenant: 0,
      skippedNoContact: 0,
      skippedAlreadyMigrated: 0,
      bySource: { deals: 0, crm_deals: 0, pipeline_deals: 0 },
      appliedInserts: 0,
    };

    if (scopeTenantId && scopeWorkspaceId == null) {
      return report;
    }

    const tenantByWs = await this.loadTenantMap(scopeTenantId);
    const existingKeys = await this.loadExistingDedupeKeys(scopeTenantId);
    const contactResolver = await this.loadContactResolver(scopeTenantId);
    const candidates: DealCandidate[] = [];

    await this.loadLegacyDeals(candidates, tenantByWs, contactResolver, report, scopeWorkspaceId);
    await this.loadLegacyCrmDeals(candidates, tenantByWs, contactResolver, report, scopeWorkspaceId);
    await this.loadLegacyPipelineDeals(candidates, tenantByWs, report, scopeWorkspaceId);

    report.candidatesTotal = candidates.length;

    const byDedupe = new Map<string, DealCandidate[]>();
    for (const c of candidates) {
      const list = byDedupe.get(c.dedupeKey) ?? [];
      list.push(c);
      byDedupe.set(c.dedupeKey, list);
    }

    const toInsert: DealCandidate[] = [];

    for (const [key, group] of byDedupe) {
      if (group.length > 1) {
        report.conflicts.push({
          dedupeKey: key,
          tenantId: group[0].tenantId,
          sources: [...new Set(group.map((g) => g.source))],
          legacyIds: group.map((g) => `${g.source}:${g.legacyId}`),
          reason: "multiple_legacy_rows_same_dedupe_key",
        });
        continue;
      }
      const pick = group[0];
      if (existingKeys.has(key)) {
        report.duplicates += 1;
        continue;
      }
      const migrated = await this.isSourceAlreadyMigrated(pick.source, pick.legacyId);
      if (migrated) {
        report.skippedAlreadyMigrated += 1;
        report.duplicates += 1;
        continue;
      }
      toInsert.push(pick);
    }

    report.newDeals = toInsert.length;

    if (mode === "apply" && toInsert.length > 0) {
      for (const c of toInsert) {
        try {
          await this.insertDeal(c);
          report.appliedInserts += 1;
          existingKeys.add(c.dedupeKey);
        } catch (e: unknown) {
          report.errors.push({
            source: c.source,
            legacyId: c.legacyId,
            workspaceId: c.workspaceId,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    return report;
  }

  private async resolveWorkspaceForTenant(tenantId: string): Promise<number | null> {
    const rows = await this.db.query<{ workspace_id: number }>(
      `SELECT workspace_id FROM saas_tenants WHERE id = $1 AND workspace_id IS NOT NULL LIMIT 1`,
      [tenantId],
    );
    return rows[0]?.workspace_id ?? null;
  }

  private async loadTenantMap(scopeTenantId: string | null): Promise<Map<number, string>> {
    const rows = await this.db.query<TenantMapRow>(
      scopeTenantId
        ? `SELECT id, workspace_id FROM saas_tenants WHERE workspace_id IS NOT NULL AND id = $1`
        : `SELECT id, workspace_id FROM saas_tenants WHERE workspace_id IS NOT NULL`,
      scopeTenantId ? [scopeTenantId] : [],
    );
    const map = new Map<number, string>();
    for (const r of rows) {
      map.set(r.workspace_id, r.id);
    }
    return map;
  }

  private async loadExistingDedupeKeys(scopeTenantId: string | null): Promise<Set<string>> {
    const rows = await this.db.query<{
      tenant_id: string;
      contact_id: string | null;
      title: string;
      value: string | number;
    }>(
      scopeTenantId
        ? `SELECT tenant_id, contact_id, title, value FROM saas_deals WHERE tenant_id = $1`
        : `SELECT tenant_id, contact_id, title, value FROM saas_deals`,
      scopeTenantId ? [scopeTenantId] : [],
    );
    const set = new Set<string>();
    for (const r of rows) {
      set.add(
        buildDealDedupeKey(r.tenant_id, r.contact_id, r.title, toNumber(r.value)),
      );
    }
    return set;
  }

  private async loadContactResolver(scopeTenantId: string | null): Promise<Map<string, string>> {
    const rows = await this.db.query<{ id: string; tenant_id: string; tags: string[] | null }>(
      scopeTenantId
        ? `SELECT id, tenant_id, tags FROM saas_contacts WHERE tenant_id = $1`
        : `SELECT id, tenant_id, tags FROM saas_contacts`,
      scopeTenantId ? [scopeTenantId] : [],
    );
    const map = new Map<string, string>();
    for (const r of rows) {
      for (const t of r.tags ?? []) {
        if (t.startsWith("etl:legacy_id:")) {
          map.set(`${r.tenant_id}:${t}`, r.id);
        }
      }
    }
    return map;
  }

  private resolveContactId(
    tenantId: string,
    source: ContactEtlSource,
    legacyContactId: string,
    resolver: Map<string, string>,
  ): string | null {
    const tag = etlLegacyIdTag(source, legacyContactId);
    return resolver.get(`${tenantId}:${tag}`) ?? null;
  }

  private async isSourceAlreadyMigrated(source: DealEtlSource, legacyId: string): Promise<boolean> {
    const tag = etlDealLegacySourceTag(source, legacyId);
    const rows = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_deals WHERE source = $1 LIMIT 1`,
      [tag],
    );
    return rows.length > 0;
  }

  private resolveTenant(
    workspaceId: number,
    tenantByWs: Map<number, string>,
    report: SaasDealsEtlReport,
  ): string | null {
    const tid = tenantByWs.get(workspaceId);
    if (!tid) report.skippedNoTenant += 1;
    return tid ?? null;
  }

  private async loadLegacyDeals(
    out: DealCandidate[],
    tenantByWs: Map<number, string>,
    contactResolver: Map<string, string>,
    report: SaasDealsEtlReport,
    scopeWorkspaceId: number | null,
  ): Promise<void> {
    const reg = await this.db.query<{ reg: string | null }>(
      `SELECT to_regclass('public.deals')::text AS reg`,
    );
    if (!reg[0]?.reg) return;

    const rows = await this.db.query<{
      id: number;
      workspace_id: number;
      contact_id: number | null;
      title: string;
      value: number | null;
      currency: string | null;
      stage: string;
      probability: number | null;
      expected_close: Date | string | null;
      notes: string | null;
    }>(
      scopeWorkspaceId != null
        ? `SELECT id, workspace_id, contact_id, title, value, currency, stage, probability, expected_close, notes
           FROM deals WHERE workspace_id = $1`
        : `SELECT id, workspace_id, contact_id, title, value, currency, stage, probability, expected_close, notes
           FROM deals WHERE workspace_id IS NOT NULL`,
      scopeWorkspaceId != null ? [scopeWorkspaceId] : [],
    );

    for (const r of rows) {
      report.bySource.deals += 1;
      const tenantId = this.resolveTenant(r.workspace_id, tenantByWs, report);
      if (!tenantId) continue;

      let contactId: string | null = null;
      if (r.contact_id != null) {
        contactId = this.resolveContactId(tenantId, "contacts", String(r.contact_id), contactResolver);
        if (!contactId) {
          report.skippedNoContact += 1;
        }
      }

      const legacyId = String(r.id);
      const title = r.title.trim() || `Deal #${legacyId}`;
      const value = toNumber(r.value);
      const sourceTag = etlDealLegacySourceTag("deals", legacyId);
      const c: DealCandidate = {
        source: "deals",
        legacyId,
        workspaceId: r.workspace_id,
        tenantId,
        contactId,
        title,
        value,
        currency: (r.currency ?? "EUR").trim() || "EUR",
        stage: mapLegacyDealStageToSaas(r.stage),
        probability: r.probability ?? 10,
        expectedCloseDate: formatDate(r.expected_close),
        notes: r.notes,
        sourceTag,
        dedupeKey: "",
      };
      c.dedupeKey = buildDealDedupeKey(tenantId, contactId, title, value);
      out.push(c);
    }
  }

  private async loadLegacyCrmDeals(
    out: DealCandidate[],
    tenantByWs: Map<number, string>,
    contactResolver: Map<string, string>,
    report: SaasDealsEtlReport,
    scopeWorkspaceId: number | null,
  ): Promise<void> {
    const reg = await this.db.query<{ reg: string | null }>(
      `SELECT to_regclass('public.crm_deals')::text AS reg`,
    );
    if (!reg[0]?.reg) return;

    const rows = await this.db.query<{
      id: string;
      workspace_id: number;
      contact_id: string;
      title: string;
      value: string | number;
      currency: string;
      stage: string;
      probability: number;
      close_date: Date | string | null;
      notes: string | null;
    }>(
      scopeWorkspaceId != null
        ? `SELECT id, workspace_id, contact_id, title, value, currency, stage, probability, close_date, notes
           FROM crm_deals WHERE workspace_id = $1`
        : `SELECT id, workspace_id, contact_id, title, value, currency, stage, probability, close_date, notes
           FROM crm_deals WHERE workspace_id IS NOT NULL`,
      scopeWorkspaceId != null ? [scopeWorkspaceId] : [],
    );

    for (const r of rows) {
      report.bySource.crm_deals += 1;
      const tenantId = this.resolveTenant(r.workspace_id, tenantByWs, report);
      if (!tenantId) continue;

      const contactId = this.resolveContactId(tenantId, "crm_contacts", r.contact_id, contactResolver);
      if (!contactId) {
        report.skippedNoContact += 1;
      }

      const legacyId = r.id;
      const title = r.title.trim() || `CRM deal ${legacyId.slice(0, 8)}`;
      const value = toNumber(r.value);
      const sourceTag = etlDealLegacySourceTag("crm_deals", legacyId);
      const c: DealCandidate = {
        source: "crm_deals",
        legacyId,
        workspaceId: r.workspace_id,
        tenantId,
        contactId,
        title,
        value,
        currency: r.currency || "EUR",
        stage: mapLegacyDealStageToSaas(r.stage),
        probability: r.probability,
        expectedCloseDate: formatDate(r.close_date),
        notes: r.notes,
        sourceTag,
        dedupeKey: "",
      };
      c.dedupeKey = buildDealDedupeKey(tenantId, contactId, title, value);
      out.push(c);
    }
  }

  private async loadLegacyPipelineDeals(
    out: DealCandidate[],
    tenantByWs: Map<number, string>,
    report: SaasDealsEtlReport,
    scopeWorkspaceId: number | null,
  ): Promise<void> {
    const reg = await this.db.query<{ reg: string | null }>(
      `SELECT to_regclass('public.pipeline_deals')::text AS reg`,
    );
    if (!reg[0]?.reg) return;

    const rows = await this.db.query<{
      id: number;
      workspace_id: number;
      name: string;
      value: number | null;
      stage: string;
      probability: number | null;
    }>(
      scopeWorkspaceId != null
        ? `SELECT id, workspace_id, name, value, stage, probability
           FROM pipeline_deals WHERE workspace_id = $1`
        : `SELECT id, workspace_id, name, value, stage, probability
           FROM pipeline_deals WHERE workspace_id IS NOT NULL`,
      scopeWorkspaceId != null ? [scopeWorkspaceId] : [],
    );

    for (const r of rows) {
      report.bySource.pipeline_deals += 1;
      const tenantId = this.resolveTenant(r.workspace_id, tenantByWs, report);
      if (!tenantId) continue;

      const legacyId = String(r.id);
      const title = r.name.trim() || `Pipeline #${legacyId}`;
      const value = toNumber(r.value);
      const sourceTag = etlDealLegacySourceTag("pipeline_deals", legacyId);
      const c: DealCandidate = {
        source: "pipeline_deals",
        legacyId,
        workspaceId: r.workspace_id,
        tenantId,
        contactId: null,
        title,
        value,
        currency: "EUR",
        stage: mapLegacyDealStageToSaas(r.stage),
        probability: r.probability ?? 10,
        expectedCloseDate: null,
        notes: null,
        sourceTag,
        dedupeKey: "",
      };
      c.dedupeKey = buildDealDedupeKey(tenantId, null, title, value);
      out.push(c);
    }
  }

  private async insertDeal(c: DealCandidate): Promise<void> {
    await this.db.query(
      `INSERT INTO saas_deals
         (tenant_id, contact_id, title, value, currency, stage, probability,
          expected_close_date, source, notes, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
      [
        c.tenantId,
        c.contactId,
        c.title,
        c.value,
        c.currency,
        c.stage,
        Math.min(100, Math.max(0, c.probability)),
        c.expectedCloseDate,
        c.sourceTag,
        c.notes,
      ],
    );
  }
}

function toNumber(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatDate(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.slice(0, 10);
  return v.toISOString().slice(0, 10);
}

let cachedEtl: SaasDealsEtlService | undefined;

export function getSaasDealsEtlService(): SaasDealsEtlService {
  if (!cachedEtl) {
    cachedEtl = new SaasDealsEtlService(DbClient.getInstance());
  }
  return cachedEtl;
}

export function resetSaasDealsEtlServiceForTests(): void {
  cachedEtl = undefined;
}
