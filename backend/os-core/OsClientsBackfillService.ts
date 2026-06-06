import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "../saas/SaasOnboardingService";
import {
  type LegacyClientRow,
  LEGACY_SOURCE,
  buildClientDedupeKey,
  mapLegacyStatus,
  normalizeEmail,
} from "./osClientsDedupe";

export type OsClientsBackfillMode = "dry-run" | "apply";

export type OsClientsBackfillConflict = {
  dedupeKey: string;
  legacyIds: number[];
  reason: "multiple_legacy_rows_same_dedupe_key";
};

export type OsClientsBackfillError = {
  legacyId: number;
  workspaceId: number | null;
  message: string;
};

export type OsClientsBackfillReport = {
  mode: OsClientsBackfillMode;
  executedAt: string;
  legacyTotal: number;
  candidatesNew: number;
  duplicates: number;
  conflicts: OsClientsBackfillConflict[];
  errors: OsClientsBackfillError[];
  skippedNoWorkspace: number;
  skippedAlreadyMigrated: number;
  appliedInserts: number;
};

type ExistingOsClient = {
  id: string;
  legacy_nelvyon_client_id: number | null;
  workspace_id: number;
  contact_email: string | null;
  business_name: string;
};

const LEGACY_OPTIONAL_COLUMNS = [
  "contact_email",
  "contact_phone",
  "status",
  "notes",
  "ideal_customer",
  "value_proposition",
  "differentiator",
  "services",
  "objectives",
  "brand_tone",
  "visual_style",
  "brand_colors",
  "logo_url",
  "competition",
  "testimonials",
  "case_studies",
  "budget",
  "language",
  "market",
  "website_url",
  "created_at",
] as const;

export class OsClientsBackfillService {
  constructor(private readonly db: SaasPostgresPort) {}

  async run(mode: OsClientsBackfillMode): Promise<OsClientsBackfillReport> {
    const report: OsClientsBackfillReport = {
      mode,
      executedAt: new Date().toISOString(),
      legacyTotal: 0,
      candidatesNew: 0,
      duplicates: 0,
      conflicts: [],
      errors: [],
      skippedNoWorkspace: 0,
      skippedAlreadyMigrated: 0,
      appliedInserts: 0,
    };

    const hasLegacy = await this.tableExists("nelvyon_clients");
    if (!hasLegacy) {
      report.errors.push({
        legacyId: 0,
        workspaceId: null,
        message: "Tabla nelvyon_clients no existe — nada que migrar",
      });
      return report;
    }

    const hasTarget = await this.tableExists("os_clients");
    if (!hasTarget) {
      report.errors.push({
        legacyId: 0,
        workspaceId: null,
        message: "Tabla os_clients no existe — ejecutar migración 315 primero",
      });
      return report;
    }

    const legacyRows = await this.loadLegacyClients();
    report.legacyTotal = legacyRows.length;

    const existingByLegacy = await this.loadExistingByLegacyId();
    const existingByDedupe = await this.loadExistingDedupeIndex();

    const toInsert: Array<{ row: LegacyClientRow; dedupeKey: string }> = [];
    const dedupeGroups = new Map<string, number[]>();

    for (const row of legacyRows) {
      if (existingByLegacy.has(row.id)) {
        report.skippedAlreadyMigrated++;
        continue;
      }

      if (row.workspace_id == null) {
        report.skippedNoWorkspace++;
        report.errors.push({
          legacyId: row.id,
          workspaceId: null,
          message: "workspace_id NULL — omitido",
        });
        continue;
      }

      if (!row.business_name?.trim()) {
        report.errors.push({
          legacyId: row.id,
          workspaceId: row.workspace_id,
          message: "business_name vacío — omitido",
        });
        continue;
      }

      const dedupeKey = buildClientDedupeKey(row.workspace_id, row.contact_email, row.business_name);
      const group = dedupeGroups.get(dedupeKey) ?? [];
      group.push(row.id);
      dedupeGroups.set(dedupeKey, group);

      const existing = existingByDedupe.get(dedupeKey);
      if (existing) {
        report.duplicates++;
        continue;
      }
    }

    for (const [dedupeKey, ids] of dedupeGroups) {
      if (ids.length > 1) {
        const unmigrated = ids.filter((id) => !existingByLegacy.has(id));
        if (unmigrated.length > 1) {
          report.conflicts.push({
            dedupeKey,
            legacyIds: unmigrated,
            reason: "multiple_legacy_rows_same_dedupe_key",
          });
        }
      }
    }

    const conflictLegacyIds = new Set(
      report.conflicts.flatMap((c) => c.legacyIds),
    );

    for (const row of legacyRows) {
      if (existingByLegacy.has(row.id)) continue;
      if (row.workspace_id == null || !row.business_name?.trim()) continue;

      const dedupeKey = buildClientDedupeKey(row.workspace_id, row.contact_email, row.business_name);
      if (existingByDedupe.has(dedupeKey)) continue;
      if (conflictLegacyIds.has(row.id)) continue;

      toInsert.push({ row, dedupeKey });
    }

    report.candidatesNew = toInsert.length;

    if (mode === "apply") {
      for (const { row } of toInsert) {
        try {
          await this.insertOsClient(row);
          report.appliedInserts++;
        } catch (e: unknown) {
          report.errors.push({
            legacyId: row.id,
            workspaceId: row.workspace_id,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    return report;
  }

  private async tableExists(table: string): Promise<boolean> {
    const rows = await this.db.query<{ reg: string | null }>(
      "SELECT to_regclass($1)::text AS reg",
      [`public.${table}`],
    );
    return Boolean(rows[0]?.reg);
  }

  private async loadLegacyColumnSet(): Promise<Set<string>> {
    const rows = await this.db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'nelvyon_clients'`,
    );
    return new Set(rows.map((r) => r.column_name));
  }

  private async loadLegacyClients(): Promise<LegacyClientRow[]> {
    const cols = await this.loadLegacyColumnSet();
    const selectParts = [
      "id",
      "user_id",
      "workspace_id",
      "business_name",
      "sector",
      "country",
      "city",
      ...LEGACY_OPTIONAL_COLUMNS.filter((c) => cols.has(c)),
    ];
    const unique = [...new Set(selectParts)];
    const sql = `SELECT ${unique.join(", ")} FROM nelvyon_clients ORDER BY id ASC`;
    const rows = await this.db.query<Record<string, unknown>>(sql);
    return rows.map((r) => ({
      id: Number(r.id),
      user_id: String(r.user_id ?? ""),
      workspace_id: r.workspace_id != null ? Number(r.workspace_id) : null,
      business_name: String(r.business_name ?? ""),
      sector: r.sector != null ? String(r.sector) : null,
      country: r.country != null ? String(r.country) : null,
      city: r.city != null ? String(r.city) : null,
      contact_email: r.contact_email != null ? String(r.contact_email) : null,
      contact_phone: r.contact_phone != null ? String(r.contact_phone) : null,
      status: r.status != null ? String(r.status) : null,
      notes: r.notes != null ? String(r.notes) : null,
      ideal_customer: r.ideal_customer != null ? String(r.ideal_customer) : null,
      value_proposition: r.value_proposition != null ? String(r.value_proposition) : null,
      differentiator: r.differentiator != null ? String(r.differentiator) : null,
      services: r.services != null ? String(r.services) : null,
      objectives: r.objectives != null ? String(r.objectives) : null,
      brand_tone: r.brand_tone != null ? String(r.brand_tone) : null,
      visual_style: r.visual_style != null ? String(r.visual_style) : null,
      brand_colors: r.brand_colors != null ? String(r.brand_colors) : null,
      logo_url: r.logo_url != null ? String(r.logo_url) : null,
      competition: r.competition != null ? String(r.competition) : null,
      testimonials: r.testimonials != null ? String(r.testimonials) : null,
      case_studies: r.case_studies != null ? String(r.case_studies) : null,
      budget: r.budget != null ? String(r.budget) : null,
      language: r.language != null ? String(r.language) : null,
      market: r.market != null ? String(r.market) : null,
      website_url: r.website_url != null ? String(r.website_url) : null,
      created_at: r.created_at instanceof Date ? r.created_at : r.created_at ? new Date(String(r.created_at)) : null,
    }));
  }

  private async loadExistingByLegacyId(): Promise<Set<number>> {
    const rows = await this.db.query<{ legacy_nelvyon_client_id: number }>(
      `SELECT legacy_nelvyon_client_id FROM os_clients
       WHERE legacy_nelvyon_client_id IS NOT NULL`,
    );
    return new Set(rows.map((r) => r.legacy_nelvyon_client_id));
  }

  private async loadExistingDedupeIndex(): Promise<Map<string, ExistingOsClient>> {
    const rows = await this.db.query<ExistingOsClient>(
      `SELECT id, legacy_nelvyon_client_id, workspace_id, contact_email, business_name
       FROM os_clients`,
    );
    const map = new Map<string, ExistingOsClient>();
    for (const r of rows) {
      const key = buildClientDedupeKey(r.workspace_id, r.contact_email, r.business_name);
      map.set(key, r);
    }
    return map;
  }

  private async insertOsClient(row: LegacyClientRow): Promise<void> {
    const metadata = {
      source: LEGACY_SOURCE,
      legacy_id: row.id,
      imported_at: new Date().toISOString(),
      ...(row.notes ? { notes: row.notes } : {}),
      ...(row.contact_phone ? { contact_phone: row.contact_phone } : {}),
    };

    await this.db.query(
      `INSERT INTO os_clients (
        workspace_id, created_by_user_id, business_name, sector, country, city,
        status, contact_email, website_url,
        ideal_customer, value_proposition, differentiator, services, objectives,
        brand_tone, visual_style, brand_colors, logo_url, competition,
        testimonials, case_studies, budget, language, market,
        metadata, legacy_nelvyon_client_id, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
        COALESCE($27, NOW()), NOW()
      )`,
      [
        row.workspace_id,
        row.user_id,
        row.business_name.trim(),
        row.sector,
        row.country,
        row.city,
        mapLegacyStatus(row.status),
        normalizeEmail(row.contact_email),
        row.website_url,
        row.ideal_customer,
        row.value_proposition,
        row.differentiator,
        row.services,
        row.objectives,
        row.brand_tone,
        row.visual_style,
        row.brand_colors,
        row.logo_url,
        row.competition,
        row.testimonials,
        row.case_studies,
        row.budget,
        row.language,
        row.market,
        JSON.stringify(metadata),
        row.id,
        row.created_at,
      ],
    );
  }
}

let singleton: OsClientsBackfillService | undefined;

export function getOsClientsBackfillService(db?: SaasPostgresPort): OsClientsBackfillService {
  if (db) return new OsClientsBackfillService(db);
  if (!singleton) {
    singleton = new OsClientsBackfillService(DbClient.getInstance());
  }
  return singleton;
}

export function resetOsClientsBackfillServiceForTests(): void {
  singleton = undefined;
}
