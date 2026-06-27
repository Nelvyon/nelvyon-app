/**
 * O29 — OsBriefDiffRerunService unit tests (mock db + ports)
 */
import { describe, expect, it, vi } from "vitest";
import {
  OsBriefDiffRerunService,
  OsBriefDiffError,
  diffIntake,
  isMaterialDiff,
  mergeIntake,
  normalizeIntakeValue,
  MATERIAL_INTAKE_FIELDS,
  type DiffPackRunPort,
  type DiffRunnerPort,
} from "../OsBriefDiffRerunService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const SOURCE_ID = "11111111-1111-1111-1111-111111111111";
const DIFF_ID = "22222222-2222-2222-2222-222222222222";
const NEW_RUN_ID = "33333333-3333-3333-3333-333333333333";

const baseIntake = {
  business_name: "Clínica Sol",
  sector: "dental",
  city: "Madrid",
  value_proposition: "Sonrisas perfectas",
  primary_cta: "Reserva cita",
  country: "ES",
};

function makeDb(handler: (sql: string, params: unknown[]) => unknown[]): SaasPostgresPort {
  return { query: vi.fn().mockImplementation(async (sql: string, params: unknown[]) => handler(sql, params)) } as unknown as SaasPostgresPort;
}

const packRunPort: DiffPackRunPort = {
  getPackRun: async (id) =>
    id === SOURCE_ID
      ? { id: SOURCE_ID, packId: "local-business-growth", workspaceId: 1, userId: "u1", intake: { ...baseIntake }, status: "completed" }
      : null,
};

const okRunner: DiffRunnerPort = {
  validate: () => ({ ...baseIntake, value_proposition: "Nueva propuesta" }),
  run: async () => ({ id: NEW_RUN_ID }),
};

describe("O29 — normalizeIntakeValue", () => {
  it("trims strings", () => {
    expect(normalizeIntakeValue("  hola  ")).toBe("hola");
  });
});

describe("O29 — diffIntake", () => {
  it("detects value_proposition change", () => {
    const changes = diffIntake(baseIntake, { ...baseIntake, value_proposition: "Otro" });
    expect(changes.some((c) => c.field === "value_proposition")).toBe(true);
  });

  it("no changes when identical", () => {
    expect(diffIntake(baseIntake, { ...baseIntake })).toEqual([]);
  });

  it("detects added field", () => {
    const changes = diffIntake(baseIntake, { ...baseIntake, website_url: "https://x.com" });
    expect(changes.some((c) => c.kind === "added")).toBe(true);
  });
});

describe("O29 — isMaterialDiff", () => {
  it("true on sector change", () => {
    expect(isMaterialDiff(diffIntake(baseIntake, { ...baseIntake, sector: "legal" }))).toBe(true);
  });

  it("false on country-only change", () => {
    expect(isMaterialDiff(diffIntake(baseIntake, { ...baseIntake, country: "PT" }))).toBe(false);
  });

  it("uses MATERIAL_INTAKE_FIELDS constant", () => {
    expect(MATERIAL_INTAKE_FIELDS).toContain("value_proposition");
  });
});

describe("O29 — mergeIntake", () => {
  it("patch overrides base", () => {
    const m = mergeIntake(baseIntake, { value_proposition: "  Nuevo  " });
    expect(m.value_proposition).toBe("Nuevo");
  });
});

describe("O29 — compare", () => {
  it("INSERT with status compared", async () => {
    let inserted = false;
    const db = makeDb((sql) => {
      if (sql.includes("INSERT INTO os_brief_diff_runs")) {
        inserted = true;
        return [{
          id: DIFF_ID, source_pack_run_id: SOURCE_ID, new_pack_run_id: null, pack_id: "local-business-growth",
          tenant_id: null, workspace_id: 1, before_intake: baseIntake,
          after_intake: { ...baseIntake, value_proposition: "Nueva" },
          diff: [{ field: "value_proposition", before: "Sonrisas perfectas", after: "Nueva", kind: "changed" }],
          change_count: 1, material: true, status: "compared", error_message: null, requested_by: "u1",
          metadata: {}, created_at: new Date().toISOString(), rerun_started_at: null, completed_at: null,
        }];
      }
      return [];
    });
    const svc = new OsBriefDiffRerunService(db, packRunPort);
    const diff = await svc.compare({ sourcePackRunId: SOURCE_ID, newIntake: { value_proposition: "Nueva" }, requestedBy: "u1" });
    expect(inserted).toBe(true);
    expect(diff.status).toBe("compared");
    expect(diff.material).toBe(true);
  });

  it("no_change when identical", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("INSERT")) {
        return [{
          id: DIFF_ID, source_pack_run_id: SOURCE_ID, new_pack_run_id: null, pack_id: "local-business-growth",
          tenant_id: null, workspace_id: 1, before_intake: baseIntake, after_intake: baseIntake,
          diff: [], change_count: 0, material: false, status: "no_change", error_message: null, requested_by: null,
          metadata: {}, created_at: new Date().toISOString(), rerun_started_at: null, completed_at: null,
        }];
      }
      return [];
    });
    const svc = new OsBriefDiffRerunService(db, packRunPort);
    const diff = await svc.compare({ sourcePackRunId: SOURCE_ID, newIntake: {} });
    expect(diff.status).toBe("no_change");
  });

  it("NOT_FOUND when source missing", async () => {
    const svc = new OsBriefDiffRerunService(makeDb(() => []), { getPackRun: async () => null });
    await expect(svc.compare({ sourcePackRunId: "bad", newIntake: {} })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("O29 — executeRerun", () => {
  it("calls runner and sets completed", async () => {
    const run = vi.fn().mockResolvedValue({ id: NEW_RUN_ID });
    const runner: DiffRunnerPort = { validate: () => baseIntake, run };
    const db = makeDb((sql) => {
      if (sql.includes("SELECT * FROM os_brief_diff_runs WHERE id")) {
        return [{
          id: DIFF_ID, source_pack_run_id: SOURCE_ID, new_pack_run_id: null, pack_id: "local-business-growth",
          tenant_id: null, workspace_id: 1, before_intake: baseIntake,
          after_intake: { ...baseIntake, value_proposition: "Nueva" },
          diff: [], change_count: 1, material: true, status: "compared", error_message: null, requested_by: null,
          metadata: {}, created_at: new Date().toISOString(), rerun_started_at: null, completed_at: null,
        }];
      }
      if (sql.includes("UPDATE") && sql.includes("completed")) {
        return [{
          id: DIFF_ID, source_pack_run_id: SOURCE_ID, new_pack_run_id: NEW_RUN_ID, pack_id: "local-business-growth",
          tenant_id: null, workspace_id: 1, before_intake: baseIntake, after_intake: baseIntake,
          diff: [], change_count: 1, material: true, status: "completed", error_message: null, requested_by: null,
          metadata: {}, created_at: new Date().toISOString(), rerun_started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
        }];
      }
      return [];
    });
    const svc = new OsBriefDiffRerunService(db);
    const result = await svc.executeRerun(DIFF_ID, { userId: "u1", workspaceId: 1, runner });
    expect(run).toHaveBeenCalled();
    expect(result.newPackRunId).toBe(NEW_RUN_ID);
  });

  it("NO_CHANGE throws on no_change diff", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("SELECT * FROM os_brief_diff_runs")) {
        return [{
          id: DIFF_ID, source_pack_run_id: SOURCE_ID, new_pack_run_id: null, pack_id: "x",
          tenant_id: null, workspace_id: 1, before_intake: {}, after_intake: {},
          diff: [], change_count: 0, material: false, status: "no_change", error_message: null, requested_by: null,
          metadata: {}, created_at: new Date().toISOString(), rerun_started_at: null, completed_at: null,
        }];
      }
      return [];
    });
    const svc = new OsBriefDiffRerunService(db);
    await expect(svc.executeRerun(DIFF_ID, { userId: "u1", runner: okRunner })).rejects.toMatchObject({ code: "NO_CHANGE" });
  });

  it("runner failure → failed status", async () => {
    const runner: DiffRunnerPort = {
      validate: () => baseIntake,
      run: async () => { throw new Error("boom"); },
    };
    const db = makeDb((sql) => {
      if (sql.includes("SELECT * FROM os_brief_diff_runs")) {
        return [{
          id: DIFF_ID, source_pack_run_id: SOURCE_ID, new_pack_run_id: null, pack_id: "local-business-growth",
          tenant_id: null, workspace_id: 1, before_intake: baseIntake, after_intake: baseIntake,
          diff: [], change_count: 1, material: true, status: "compared", error_message: null, requested_by: null,
          metadata: {}, created_at: new Date().toISOString(), rerun_started_at: null, completed_at: null,
        }];
      }
      return [];
    });
    const svc = new OsBriefDiffRerunService(db);
    await expect(svc.executeRerun(DIFF_ID, { userId: "u1", workspaceId: 1, runner })).rejects.toBeInstanceOf(OsBriefDiffError);
  });
});

describe("O29 — listDiffs + getSummary", () => {
  it("listDiffs filter by sourcePackRunId", async () => {
    const db = makeDb((sql, params) => {
      if (sql.includes("SELECT * FROM os_brief_diff_runs") && params[0] === SOURCE_ID) {
        return [{
          id: DIFF_ID, source_pack_run_id: SOURCE_ID, new_pack_run_id: null, pack_id: "x",
          tenant_id: null, workspace_id: 1, before_intake: {}, after_intake: {},
          diff: [], change_count: 1, material: true, status: "compared", error_message: null, requested_by: null,
          metadata: {}, created_at: new Date().toISOString(), rerun_started_at: null, completed_at: null,
        }];
      }
      return [];
    });
    const svc = new OsBriefDiffRerunService(db);
    const list = await svc.listDiffs({ sourcePackRunId: SOURCE_ID });
    expect(list).toHaveLength(1);
  });

  it("getSummary counts", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("COUNT(*)")) {
        return [{ total: "5", material: "3", no_change: "1", completed: "2", failed: "0", last_diff_at: "2026-01-01" }];
      }
      return [];
    });
    const svc = new OsBriefDiffRerunService(db);
    const s = await svc.getSummary();
    expect(s.total).toBe(5);
    expect(s.material).toBe(3);
  });
});

describe("O29 — compareAndRerun", () => {
  it("one-shot material with execute", async () => {
    const db = makeDb((sql) => {
      if (sql.includes("INSERT")) {
        return [{
          id: DIFF_ID, source_pack_run_id: SOURCE_ID, new_pack_run_id: null, pack_id: "local-business-growth",
          tenant_id: null, workspace_id: 1, before_intake: baseIntake, after_intake: baseIntake,
          diff: [{ field: "value_proposition", kind: "changed" }], change_count: 1, material: true, status: "compared",
          error_message: null, requested_by: null, metadata: {}, created_at: new Date().toISOString(),
          rerun_started_at: null, completed_at: null,
        }];
      }
      if (sql.includes("SELECT * FROM os_brief_diff_runs WHERE id")) {
        return [{
          id: DIFF_ID, source_pack_run_id: SOURCE_ID, new_pack_run_id: NEW_RUN_ID, pack_id: "local-business-growth",
          tenant_id: null, workspace_id: 1, before_intake: baseIntake, after_intake: baseIntake,
          diff: [], change_count: 1, material: true, status: "completed", error_message: null, requested_by: null,
          metadata: {}, created_at: new Date().toISOString(), rerun_started_at: null, completed_at: new Date().toISOString(),
        }];
      }
      if (sql.includes("UPDATE") && sql.includes("completed")) {
        return [{
          id: DIFF_ID, source_pack_run_id: SOURCE_ID, new_pack_run_id: NEW_RUN_ID, pack_id: "local-business-growth",
          tenant_id: null, workspace_id: 1, before_intake: baseIntake, after_intake: baseIntake,
          diff: [], change_count: 1, material: true, status: "completed", error_message: null, requested_by: null,
          metadata: {}, created_at: new Date().toISOString(), rerun_started_at: null, completed_at: new Date().toISOString(),
        }];
      }
      return [];
    });
    const svc = new OsBriefDiffRerunService(db, packRunPort);
    const result = await svc.compareAndRerun(
      { sourcePackRunId: SOURCE_ID, newIntake: { value_proposition: "X" }, execute: true },
      { userId: "u1", runner: okRunner },
    );
    expect(result.newPackRunId).toBe(NEW_RUN_ID);
  });
});
