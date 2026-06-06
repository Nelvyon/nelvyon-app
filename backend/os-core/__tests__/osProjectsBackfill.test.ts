import { describe, expect, it } from "vitest";

import { OsProjectsBackfillService } from "../OsProjectsBackfillService";
import {
  LEGACY_PROJECT_SOURCE,
  buildProjectFallbackDedupeKey,
  mapLegacyProjectPriority,
  mapLegacyProjectStatus,
  metadataLegacyProjectId,
  parseLegacyDate,
  resolveLegacyProjectName,
} from "../osProjectsDedupe";

type LegacyRow = {
  id: number;
  user_id: string;
  workspace_id: number | null;
  client_id: number;
  name: string;
  title: string | null;
  project_type: string;
  status: string | null;
  progress: number | null;
  brief: string | null;
  description: string | null;
  deliverables: string | null;
  deadline: string | null;
  start_date: string | null;
  due_date: string | null;
  priority: string | null;
  budget: string | number | null;
  created_at: Date | null;
  updated_at: Date | null;
};

type OsProjectRow = {
  id: string;
  workspace_id: number;
  client_id: string;
  name: string;
  metadata: Record<string, unknown>;
};

function makeProjectsBackfillDb(opts?: {
  legacy?: LegacyRow[];
  osProjects?: OsProjectRow[];
  clientBridge?: Array<{ workspace_id: number; legacy_nelvyon_client_id: number; id: string }>;
}) {
  const legacy: LegacyRow[] = opts?.legacy ?? [
    {
      id: 10,
      user_id: "user-1",
      workspace_id: 5,
      client_id: 100,
      name: "Website Redesign",
      title: null,
      project_type: "web",
      status: "active",
      progress: 40,
      brief: "New landing",
      description: null,
      deliverables: null,
      deadline: "2026-12-01",
      start_date: null,
      due_date: null,
      priority: "high",
      budget: "5000",
      created_at: null,
      updated_at: null,
    },
  ];
  const osProjects: OsProjectRow[] = opts?.osProjects ?? [];
  const bridge =
    opts?.clientBridge ?? [{ workspace_id: 5, legacy_nelvyon_client_id: 100, id: "client-uuid-1" }];
  const inserts: unknown[][] = [];

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();

    if (s.includes("to_regclass($1)")) {
      const table = String(params[0] ?? "").replace("public.", "");
      if (["nelvyon_projects", "os_projects", "os_clients"].includes(table)) {
        return [{ reg: table }] as T[];
      }
      return [{ reg: null }] as T[];
    }

    if (s.includes("information_schema.columns") && s.includes("nelvyon_projects")) {
      return [{ column_name: "created_at" }, { column_name: "updated_at" }] as T[];
    }

    if (s.startsWith("SELECT id, user_id, workspace_id") && s.includes("FROM nelvyon_projects")) {
      return legacy as T[];
    }

    if (s.includes("legacy_nelvyon_client_id") && s.includes("FROM os_clients")) {
      return bridge as T[];
    }

    if (s.includes("metadata FROM os_projects") && s.includes("metadata->>'source'")) {
      return osProjects
        .filter((p) => p.metadata?.source === LEGACY_PROJECT_SOURCE)
        .map((p) => ({ metadata: p.metadata })) as T[];
    }

    if (s.includes("SELECT id, workspace_id, client_id, name, metadata FROM os_projects")) {
      return osProjects as T[];
    }

    if (s.startsWith("INSERT INTO os_projects")) {
      inserts.push(params);
      return [] as T[];
    }

    return [] as T[];
  }

  return { query, legacy, osProjects, inserts, bridge };
}

describe("osProjectsDedupe", () => {
  it("mapLegacyProjectStatus", () => {
    expect(mapLegacyProjectStatus("on_hold")).toBe("paused");
    expect(mapLegacyProjectStatus(null)).toBe("draft");
    expect(mapLegacyProjectStatus("completed")).toBe("completed");
  });

  it("mapLegacyProjectPriority default medium", () => {
    expect(mapLegacyProjectPriority(null)).toBe("medium");
    expect(mapLegacyProjectPriority("urgent")).toBe("urgent");
  });

  it("resolveLegacyProjectName prefiere title", () => {
    expect(
      resolveLegacyProjectName({
        name: "A",
        title: "  Title B ",
      } as LegacyRow),
    ).toBe("Title B");
  });

  it("parseLegacyDate ISO prefix", () => {
    expect(parseLegacyDate("2026-06-15T00:00:00Z")).toBe("2026-06-15");
  });

  it("metadataLegacyProjectId", () => {
    expect(metadataLegacyProjectId({ legacy_nelvyon_project_id: 7 })).toBe(7);
  });

  it("buildProjectFallbackDedupeKey", () => {
    const k = buildProjectFallbackDedupeKey(1, "uuid", "  My Project ");
    expect(k).toContain("my project");
  });
});

describe("OsProjectsBackfillService", () => {
  it("dry-run cuenta candidatos sin insertar", async () => {
    const db = makeProjectsBackfillDb();
    const svc = new OsProjectsBackfillService(db);
    const report = await svc.run("dry-run");
    expect(report.legacyTotal).toBe(1);
    expect(report.candidatesNew).toBe(1);
    expect(report.skippedNoClientMapping).toBe(0);
    expect(report.appliedInserts).toBe(0);
    expect(db.inserts).toHaveLength(0);
  });

  it("apply inserta con metadata legacy", async () => {
    const db = makeProjectsBackfillDb();
    const svc = new OsProjectsBackfillService(db);
    const report = await svc.run("apply");
    expect(report.appliedInserts).toBe(1);
    expect(db.inserts).toHaveLength(1);
    const metadata = JSON.parse(String(db.inserts[0]?.[9]));
    expect(metadata.source).toBe(LEGACY_PROJECT_SOURCE);
    expect(metadata.legacy_nelvyon_project_id).toBe(10);
  });

  it("omite sin cliente OS mapeable", async () => {
    const db = makeProjectsBackfillDb({ clientBridge: [] });
    const svc = new OsProjectsBackfillService(db);
    const report = await svc.run("dry-run");
    expect(report.skippedNoClientMapping).toBe(1);
    expect(report.candidatesNew).toBe(0);
  });

  it("skip ya migrados por metadata legacy id", async () => {
    const db = makeProjectsBackfillDb({
      osProjects: [
        {
          id: "p1",
          workspace_id: 5,
          client_id: "client-uuid-1",
          name: "Website Redesign",
          metadata: { source: LEGACY_PROJECT_SOURCE, legacy_nelvyon_project_id: 10 },
        },
      ],
    });
    const svc = new OsProjectsBackfillService(db);
    const report = await svc.run("dry-run");
    expect(report.skippedAlreadyMigrated).toBe(1);
    expect(report.candidatesNew).toBe(0);
  });

  it("detecta duplicado fallback en os_projects", async () => {
    const db = makeProjectsBackfillDb({
      osProjects: [
        {
          id: "existing",
          workspace_id: 5,
          client_id: "client-uuid-1",
          name: "Website Redesign",
          metadata: {},
        },
      ],
    });
    const svc = new OsProjectsBackfillService(db);
    const report = await svc.run("dry-run");
    expect(report.duplicates).toBe(1);
    expect(report.candidatesNew).toBe(0);
  });

  it("detecta conflicto legacy mismo client+name", async () => {
    const db = makeProjectsBackfillDb({
      legacy: [
        {
          id: 10,
          user_id: "u1",
          workspace_id: 5,
          client_id: 100,
          name: "Same Name",
          title: null,
          project_type: "web",
          status: null,
          progress: null,
          brief: null,
          description: null,
          deliverables: null,
          deadline: null,
          start_date: null,
          due_date: null,
          priority: null,
          budget: null,
          created_at: null,
          updated_at: null,
        },
        {
          id: 11,
          user_id: "u2",
          workspace_id: 5,
          client_id: 100,
          name: "Same Name",
          title: null,
          project_type: "web",
          status: null,
          progress: null,
          brief: null,
          description: null,
          deliverables: null,
          deadline: null,
          start_date: null,
          due_date: null,
          priority: null,
          budget: null,
          created_at: null,
          updated_at: null,
        },
      ],
    });
    const svc = new OsProjectsBackfillService(db);
    const report = await svc.run("dry-run");
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0]?.legacyIds).toEqual([10, 11]);
    expect(report.candidatesNew).toBe(0);
  });
});
