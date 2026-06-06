import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "../saas/SaasOnboardingService";
import {
  LEGACY_PROJECT_SOURCE,
  type LegacyProjectRow,
  buildLegacyProjectIdKey,
  buildProjectFallbackDedupeKey,
  mapLegacyProjectPriority,
  mapLegacyProjectStatus,
  metadataLegacyProjectId,
  parseLegacyBudget,
  parseLegacyDate,
  resolveLegacyProjectName,
} from "./osProjectsDedupe";

export type OsProjectsBackfillMode = "dry-run" | "apply";

export type OsProjectsBackfillConflict = {
  dedupeKey: string;
  legacyIds: number[];
  reason: "multiple_legacy_rows_same_dedupe_key";
};

export type OsProjectsBackfillError = {
  legacyId: number;
  workspaceId: number | null;
  legacyClientId: number | null;
  message: string;
};

export type OsProjectsBackfillReport = {
  mode: OsProjectsBackfillMode;
  executedAt: string;
  legacyTotal: number;
  candidatesNew: number;
  duplicates: number;
  conflicts: OsProjectsBackfillConflict[];
  errors: OsProjectsBackfillError[];
  skippedNoWorkspace: number;
  skippedAlreadyMigrated: number;
  skippedNoClientMapping: number;
  appliedInserts: number;
};

type ExistingOsProject = {
  id: string;
  workspace_id: number;
  client_id: string;
  name: string;
  metadata: unknown;
};

type ClientBridge = {
  legacy_nelvyon_client_id: number;
  id: string;
  workspace_id: number;
};

const LEGACY_OPTIONAL_COLUMNS = [
  "title",
  "description",
  "start_date",
  "due_date",
  "budget",
  "created_at",
  "updated_at",
] as const;

export class OsProjectsBackfillService {
  constructor(private readonly db: SaasPostgresPort) {}

  async run(mode: OsProjectsBackfillMode): Promise<OsProjectsBackfillReport> {
    const report: OsProjectsBackfillReport = {
      mode,
      executedAt: new Date().toISOString(),
      legacyTotal: 0,
      candidatesNew: 0,
      duplicates: 0,
      conflicts: [],
      errors: [],
      skippedNoWorkspace: 0,
      skippedAlreadyMigrated: 0,
      skippedNoClientMapping: 0,
      appliedInserts: 0,
    };

    const hasLegacy = await this.tableExists("nelvyon_projects");
    if (!hasLegacy) {
      report.errors.push({
        legacyId: 0,
        workspaceId: null,
        legacyClientId: null,
        message: "Tabla nelvyon_projects no existe — nada que migrar",
      });
      return report;
    }

    if (!(await this.tableExists("os_projects"))) {
      report.errors.push({
        legacyId: 0,
        workspaceId: null,
        legacyClientId: null,
        message: "Tabla os_projects no existe — ejecutar migración 316 primero",
      });
      return report;
    }

    if (!(await this.tableExists("os_clients"))) {
      report.errors.push({
        legacyId: 0,
        workspaceId: null,
        legacyClientId: null,
        message: "Tabla os_clients no existe — ejecutar migración 315 y backfill clientes primero",
      });
      return report;
    }

    const legacyRows = await this.loadLegacyProjects();
    report.legacyTotal = legacyRows.length;

    const clientBridge = await this.loadClientBridge();
    const existingByLegacy = await this.loadExistingByLegacyId();
    const existingByFallback = await this.loadExistingFallbackIndex();

    const fallbackGroups = new Map<string, number[]>();

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
          legacyClientId: row.client_id,
          message: "workspace_id NULL — omitido",
        });
        continue;
      }

      const osClientId = clientBridge.get(`${row.workspace_id}:${row.client_id}`);
      if (!osClientId) {
        report.skippedNoClientMapping++;
        report.errors.push({
          legacyId: row.id,
          workspaceId: row.workspace_id,
          legacyClientId: row.client_id,
          message: `sin os_clients para legacy client_id=${row.client_id} en workspace ${row.workspace_id}`,
        });
        continue;
      }

      const projectName = resolveLegacyProjectName(row);
      if (!projectName) {
        report.errors.push({
          legacyId: row.id,
          workspaceId: row.workspace_id,
          legacyClientId: row.client_id,
          message: "name/title vacío — omitido",
        });
        continue;
      }

      const fallbackKey = buildProjectFallbackDedupeKey(row.workspace_id, osClientId, projectName);
      const fg = fallbackGroups.get(fallbackKey) ?? [];
      fg.push(row.id);
      fallbackGroups.set(fallbackKey, fg);

      if (existingByFallback.has(fallbackKey)) {
        report.duplicates++;
        continue;
      }
    }

    for (const [dedupeKey, ids] of fallbackGroups) {
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

    const conflictLegacyIds = new Set(report.conflicts.flatMap((c) => c.legacyIds));

    const toInsert: Array<{ row: LegacyProjectRow; osClientId: string; fallbackKey: string }> = [];

    for (const row of legacyRows) {
      if (existingByLegacy.has(row.id)) continue;
      if (row.workspace_id == null) continue;

      const osClientId = clientBridge.get(`${row.workspace_id}:${row.client_id}`);
      if (!osClientId) continue;

      const projectName = resolveLegacyProjectName(row);
      if (!projectName) continue;

      const fallbackKey = buildProjectFallbackDedupeKey(row.workspace_id, osClientId, projectName);
      if (existingByFallback.has(fallbackKey)) continue;
      if (conflictLegacyIds.has(row.id)) continue;

      toInsert.push({ row, osClientId, fallbackKey });
    }

    report.candidatesNew = toInsert.length;

    if (mode === "apply") {
      for (const { row, osClientId } of toInsert) {
        try {
          await this.insertOsProject(row, osClientId);
          report.appliedInserts++;
        } catch (e: unknown) {
          report.errors.push({
            legacyId: row.id,
            workspaceId: row.workspace_id,
            legacyClientId: row.client_id,
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
       WHERE table_schema = 'public' AND table_name = 'nelvyon_projects'`,
    );
    return new Set(rows.map((r) => r.column_name));
  }

  private async loadLegacyProjects(): Promise<LegacyProjectRow[]> {
    const cols = await this.loadLegacyColumnSet();
    const selectParts = [
      "id",
      "user_id",
      "workspace_id",
      "client_id",
      "name",
      "project_type",
      "status",
      "progress",
      "brief",
      "deliverables",
      "deadline",
      "priority",
      ...LEGACY_OPTIONAL_COLUMNS.filter((c) => cols.has(c)),
    ];
    const unique = [...new Set(selectParts)];
    const sql = `SELECT ${unique.join(", ")} FROM nelvyon_projects ORDER BY id ASC`;
    const rows = await this.db.query<Record<string, unknown>>(sql);
    return rows.map((r) => ({
      id: Number(r.id),
      user_id: String(r.user_id ?? ""),
      workspace_id: r.workspace_id != null ? Number(r.workspace_id) : null,
      client_id: Number(r.client_id),
      name: String(r.name ?? ""),
      title: r.title != null ? String(r.title) : null,
      project_type: String(r.project_type ?? ""),
      status: r.status != null ? String(r.status) : null,
      progress: r.progress != null ? Number(r.progress) : null,
      brief: r.brief != null ? String(r.brief) : null,
      description: r.description != null ? String(r.description) : null,
      deliverables: r.deliverables != null ? String(r.deliverables) : null,
      deadline: r.deadline != null ? String(r.deadline) : null,
      start_date: r.start_date != null ? String(r.start_date) : null,
      due_date: r.due_date != null ? String(r.due_date) : null,
      priority: r.priority != null ? String(r.priority) : null,
      budget: r.budget != null ? (r.budget as string | number) : null,
      created_at:
        r.created_at instanceof Date
          ? r.created_at
          : r.created_at
            ? new Date(String(r.created_at))
            : null,
      updated_at:
        r.updated_at instanceof Date
          ? r.updated_at
          : r.updated_at
            ? new Date(String(r.updated_at))
            : null,
    }));
  }

  private async loadClientBridge(): Promise<Map<string, string>> {
    const rows = await this.db.query<ClientBridge>(
      `SELECT id, workspace_id, legacy_nelvyon_client_id
       FROM os_clients
       WHERE legacy_nelvyon_client_id IS NOT NULL`,
    );
    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(`${r.workspace_id}:${r.legacy_nelvyon_client_id}`, r.id);
    }
    return map;
  }

  private async loadExistingByLegacyId(): Promise<Set<number>> {
    const rows = await this.db.query<{ metadata: unknown }>(
      `SELECT metadata FROM os_projects
       WHERE metadata->>'source' = $1`,
      [LEGACY_PROJECT_SOURCE],
    );
    const set = new Set<number>();
    for (const r of rows) {
      const lid = metadataLegacyProjectId(r.metadata);
      if (lid != null) set.add(lid);
    }
    return set;
  }

  private async loadExistingFallbackIndex(): Promise<Map<string, ExistingOsProject>> {
    const rows = await this.db.query<ExistingOsProject>(
      `SELECT id, workspace_id, client_id, name, metadata FROM os_projects`,
    );
    const map = new Map<string, ExistingOsProject>();
    for (const r of rows) {
      const key = buildProjectFallbackDedupeKey(r.workspace_id, r.client_id, r.name);
      map.set(key, r);
    }
    return map;
  }

  private resolveDescription(row: LegacyProjectRow): string | null {
    if (row.description?.trim()) return row.description.trim();
    if (row.brief?.trim()) return row.brief.trim();
    return null;
  }

  private resolveDueDate(row: LegacyProjectRow): string | null {
    if (row.due_date) return parseLegacyDate(row.due_date);
    if (row.deadline) return parseLegacyDate(row.deadline);
    return null;
  }

  private async insertOsProject(row: LegacyProjectRow, osClientId: string): Promise<void> {
    const projectName = resolveLegacyProjectName(row);
    const status = mapLegacyProjectStatus(row.status);
    const metadata = {
      source: LEGACY_PROJECT_SOURCE,
      legacy_id: row.id,
      legacy_nelvyon_project_id: row.id,
      legacy_client_id: row.client_id,
      project_type: row.project_type,
      imported_at: new Date().toISOString(),
      ...(row.progress != null ? { progress: row.progress } : {}),
      ...(row.deliverables ? { deliverables: row.deliverables } : {}),
    };

    const archivedAt = status === "archived" ? new Date().toISOString() : null;

    await this.db.query(
      `INSERT INTO os_projects (
        workspace_id, client_id, name, description, status, priority,
        start_date, due_date, budget, metadata, archived_at, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
        COALESCE($12, NOW()), COALESCE($13, NOW())
      )`,
      [
        row.workspace_id,
        osClientId,
        projectName,
        this.resolveDescription(row),
        status,
        mapLegacyProjectPriority(row.priority),
        parseLegacyDate(row.start_date),
        this.resolveDueDate(row),
        parseLegacyBudget(row.budget),
        JSON.stringify(metadata),
        archivedAt,
        row.created_at,
        row.updated_at,
      ],
    );
  }
}

let singleton: OsProjectsBackfillService | undefined;

export function getOsProjectsBackfillService(db?: SaasPostgresPort): OsProjectsBackfillService {
  if (db) return new OsProjectsBackfillService(db);
  if (!singleton) {
    singleton = new OsProjectsBackfillService(DbClient.getInstance());
  }
  return singleton;
}

export function resetOsProjectsBackfillServiceForTests(): void {
  singleton = undefined;
}
