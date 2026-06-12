import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import type { ContactStatus, PipelineStage } from "./SaasCrmService";
import {
  type EtlSource,
  buildDedupeKey,
  etlLegacyIdTag,
  etlSourceTag,
  mapLegacyStageToSaas,
  mapLegacyStatusToSaas,
  mergeEtlTags,
  normalizeEmail,
  pickContactEtlWinner,
} from "./saasCrmDedupe";

export type EtlMode = "dry-run" | "apply";

export type CrmEtlRunOptions = {
  /** Si true, elige un ganador por clave dedupe en lugar de omitir el grupo. */
  resolveConflicts?: boolean;
};

export type EtlConflict = {
  dedupeKey: string;
  tenantId: string;
  sources: EtlSource[];
  legacyIds: string[];
  reason: string;
};

export type EtlError = {
  source: EtlSource;
  legacyId: string;
  workspaceId: number | null;
  message: string;
};

export type SaasCrmEtlReport = {
  mode: EtlMode;
  executedAt: string;
  candidatesTotal: number;
  newContacts: number;
  duplicates: number;
  conflicts: EtlConflict[];
  errors: EtlError[];
  skippedNoTenant: number;
  skippedAlreadyMigrated: number;
  resolvedConflicts: number;
  bySource: Record<EtlSource, number>;
  appliedInserts: number;
};

type TenantMapRow = { id: string; workspace_id: number };
type ExistingRow = {
  id: string;
  tenant_id: string;
  email: string | null;
  phone: string | null;
  name: string;
  tags: string[] | null;
};

type Candidate = {
  source: EtlSource;
  legacyId: string;
  workspaceId: number;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: ContactStatus;
  pipelineStage: PipelineStage;
  notes: string | null;
  extraTags: string[];
  dedupeKey: string;
};

export class SaasCrmEtlService {
  constructor(private readonly db: SaasPostgresPort) {}

  async run(mode: EtlMode, options?: CrmEtlRunOptions): Promise<SaasCrmEtlReport> {
    const resolveConflicts = options?.resolveConflicts === true;
    const report: SaasCrmEtlReport = {
      mode,
      executedAt: new Date().toISOString(),
      candidatesTotal: 0,
      newContacts: 0,
      duplicates: 0,
      conflicts: [],
      errors: [],
      skippedNoTenant: 0,
      skippedAlreadyMigrated: 0,
      resolvedConflicts: 0,
      bySource: { contacts: 0, crm_contacts: 0 },
      appliedInserts: 0,
    };

    const tenantByWs = await this.loadTenantMap();
    const existingIndex = await this.loadExistingDedupeIndex();
    const migratedLegacy = await this.loadMigratedLegacyIds();
    const candidates: Candidate[] = [];

    await this.loadLegacyContacts(candidates, tenantByWs, report);
    await this.loadLegacyCrmContacts(candidates, tenantByWs, report);

    report.candidatesTotal = candidates.length;

    const byDedupe = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const list = byDedupe.get(c.dedupeKey) ?? [];
      list.push(c);
      byDedupe.set(c.dedupeKey, list);
    }

    const toInsert: Candidate[] = [];

    for (const [key, group] of byDedupe) {
      let pick = group[0];
      if (group.length > 1) {
        if (resolveConflicts) {
          pick = pickContactEtlWinner(group);
          report.resolvedConflicts += 1;
          report.conflicts.push({
            dedupeKey: key,
            tenantId: pick.tenantId,
            sources: [...new Set(group.map((g) => g.source))],
            legacyIds: group.map((g) => `${g.source}:${g.legacyId}`),
            reason: "resolved_pick_winner",
          });
        } else {
          report.conflicts.push({
            dedupeKey: key,
            tenantId: group[0].tenantId,
            sources: [...new Set(group.map((g) => g.source))],
            legacyIds: group.map((g) => `${g.source}:${g.legacyId}`),
            reason: "multiple_legacy_rows_same_dedupe_key",
          });
          continue;
        }
      }
      if (existingIndex.has(key)) {
        report.duplicates += 1;
        continue;
      }
      if (group.some((g) => migratedLegacy.has(etlLegacyIdTag(g.source, g.legacyId)))) {
        report.skippedAlreadyMigrated += 1;
        report.duplicates += 1;
        continue;
      }
      toInsert.push(pick);
    }

    report.newContacts = toInsert.length;

    if (mode === "apply" && toInsert.length > 0) {
      for (const c of toInsert) {
        try {
          await this.insertContact(c);
          report.appliedInserts += 1;
          existingIndex.set(c.dedupeKey, c.tenantId);
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

  private async loadTenantMap(): Promise<Map<number, string>> {
    const rows = await this.db.query<TenantMapRow>(
      `SELECT id, workspace_id FROM saas_tenants WHERE workspace_id IS NOT NULL`,
    );
    const map = new Map<number, string>();
    for (const r of rows) {
      map.set(r.workspace_id, r.id);
    }
    return map;
  }

  private async loadExistingDedupeIndex(): Promise<Map<string, string>> {
    const rows = await this.db.query<ExistingRow>(
      `SELECT id, tenant_id, email, phone, name, tags FROM saas_contacts`,
    );
    const index = new Map<string, string>();
    for (const r of rows) {
      const key = buildDedupeKey(r.tenant_id, r.email, r.phone, r.name);
      index.set(key, r.id);
    }
    return index;
  }

  private async loadMigratedLegacyIds(): Promise<Set<string>> {
    const rows = await this.db.query<{ tags: string[] | null }>(
      `SELECT tags FROM saas_contacts WHERE EXISTS (
         SELECT 1 FROM unnest(tags) t WHERE t LIKE 'etl:legacy_id:%'
       )`,
    );
    const set = new Set<string>();
    for (const r of rows) {
      for (const t of r.tags ?? []) {
        if (t.startsWith("etl:legacy_id:")) set.add(t);
      }
    }
    return set;
  }

  private resolveTenant(
    workspaceId: number,
    tenantByWs: Map<number, string>,
    report: SaasCrmEtlReport,
  ): string | null {
    const tid = tenantByWs.get(workspaceId);
    if (!tid) {
      report.skippedNoTenant += 1;
    }
    return tid ?? null;
  }

  private async loadLegacyContacts(
    out: Candidate[],
    tenantByWs: Map<number, string>,
    report: SaasCrmEtlReport,
  ): Promise<void> {
    const reg = await this.db.query<{ reg: string | null }>(
      `SELECT to_regclass('public.contacts')::text AS reg`,
    );
    if (!reg[0]?.reg) return;

    const rows = await this.db.query<{
      id: number;
      workspace_id: number;
      first_name: string;
      last_name: string | null;
      email: string;
      phone: string | null;
      company_name: string | null;
      status: string | null;
      notes: string | null;
      tags: string | null;
    }>(
      `SELECT id, workspace_id, first_name, last_name, email, phone, company_name, status, notes, tags
       FROM contacts
       WHERE workspace_id IS NOT NULL`,
    );

    for (const r of rows) {
      report.bySource.contacts += 1;
      const tenantId = this.resolveTenant(r.workspace_id, tenantByWs, report);
      if (!tenantId) continue;

      const name = [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || r.email;
      const legacyId = String(r.id);
      const tags: string[] = [];
      if (r.tags) {
        try {
          const parsed = JSON.parse(r.tags) as unknown;
          if (Array.isArray(parsed)) {
            for (const t of parsed) if (typeof t === "string") tags.push(t);
          }
        } catch {
          tags.push(r.tags);
        }
      }

      const candidate: Candidate = {
        source: "contacts",
        legacyId,
        workspaceId: r.workspace_id,
        tenantId,
        name,
        email: normalizeEmail(r.email),
        phone: r.phone,
        company: r.company_name,
        status: mapLegacyStatusToSaas(r.status),
        pipelineStage: mapLegacyStageToSaas(null, r.status),
        notes: r.notes,
        extraTags: mergeEtlTags(tags, [etlSourceTag("contacts"), etlLegacyIdTag("contacts", legacyId)]),
        dedupeKey: "",
      };
      candidate.dedupeKey = buildDedupeKey(tenantId, candidate.email, candidate.phone, candidate.name);
      out.push(candidate);
    }
  }

  private async loadLegacyCrmContacts(
    out: Candidate[],
    tenantByWs: Map<number, string>,
    report: SaasCrmEtlReport,
  ): Promise<void> {
    const cols = await this.db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'crm_contacts'`,
    );
    const names = new Set(cols.map((c) => c.column_name));
    if (!names.has("workspace_id")) {
      return;
    }

    const rows = await this.db.query<{
      id: string;
      workspace_id: number;
      name: string;
      email: string | null;
      phone: string | null;
      company: string | null;
      status: string;
      tags: unknown;
      metadata: unknown;
      notes?: string | null;
    }>(
      `SELECT id, workspace_id, name, email, phone, company, status, tags, metadata
       FROM crm_contacts
       WHERE workspace_id IS NOT NULL`,
    );

    for (const r of rows) {
      report.bySource.crm_contacts += 1;
      const tenantId = this.resolveTenant(r.workspace_id, tenantByWs, report);
      if (!tenantId) continue;

      const legacyId = r.id;
      let tagList: string[] = [];
      if (Array.isArray(r.tags)) {
        tagList = r.tags.filter((t): t is string => typeof t === "string");
      }

      const metaStage =
        typeof r.metadata === "object" && r.metadata !== null && "stage" in r.metadata
          ? String((r.metadata as { stage?: unknown }).stage ?? "")
          : null;

      const candidate: Candidate = {
        source: "crm_contacts",
        legacyId,
        workspaceId: r.workspace_id,
        tenantId,
        name: r.name.trim() || "Sin nombre",
        email: normalizeEmail(r.email),
        phone: r.phone,
        company: r.company,
        status: mapLegacyStatusToSaas(r.status),
        pipelineStage: mapLegacyStageToSaas(metaStage, r.status),
        notes: null,
        extraTags: mergeEtlTags(tagList, [
          etlSourceTag("crm_contacts"),
          etlLegacyIdTag("crm_contacts", legacyId),
        ]),
        dedupeKey: "",
      };
      candidate.dedupeKey = buildDedupeKey(tenantId, candidate.email, candidate.phone, candidate.name);
      out.push(candidate);
    }
  }

  private async insertContact(c: Candidate): Promise<void> {
    await this.db.query(
      `INSERT INTO saas_contacts
         (tenant_id, name, email, phone, company, position, status, pipeline_stage, value, notes, tags, updated_at)
       VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,0,$8,$9,NOW())`,
      [
        c.tenantId,
        c.name,
        c.email,
        c.phone,
        c.company,
        c.status,
        c.pipelineStage,
        c.notes,
        c.extraTags,
      ],
    );
  }
}

let cachedEtl: SaasCrmEtlService | undefined;

export function getSaasCrmEtlService(): SaasCrmEtlService {
  if (!cachedEtl) {
    cachedEtl = new SaasCrmEtlService(DbClient.getInstance());
  }
  return cachedEtl;
}

export function resetSaasCrmEtlServiceForTests(): void {
  cachedEtl = undefined;
}
