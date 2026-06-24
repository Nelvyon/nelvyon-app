import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaasPlaybooksService, resetSaasPlaybooksServiceForTests, DEFAULT_STAGE_PROBS, SaasPlaybooksError } from "../SaasPlaybooksService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(rows: Record<string, unknown>[] = []): SaasPostgresPort {
  return { query: vi.fn().mockResolvedValue(rows) } as unknown as SaasPostgresPort;
}

const T = "tenant-s27";
const pbRow = { id: "pb-1", tenantId: T, name: "Follow-up", stage: "contacted", description: null, active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
const actRow = { id: "act-1", playbookId: "pb-1", tenantId: T, sortOrder: 0, actionType: "task", title: "Send email", description: null, template: null, waitDays: null, createdAt: new Date().toISOString() };

beforeEach(() => { resetSaasPlaybooksServiceForTests(); });

describe("DEFAULT_STAGE_PROBS", () => {
  it("covers all 6 stages with expected defaults", () => {
    expect(DEFAULT_STAGE_PROBS.new).toBe(10);
    expect(DEFAULT_STAGE_PROBS.contacted).toBe(25);
    expect(DEFAULT_STAGE_PROBS.qualified).toBe(50);
    expect(DEFAULT_STAGE_PROBS.proposal).toBe(75);
    expect(DEFAULT_STAGE_PROBS.won).toBe(100);
    expect(DEFAULT_STAGE_PROBS.lost).toBe(0);
  });
});

describe("getStageProbabilities", () => {
  it("returns defaults when no overrides in DB", async () => {
    const svc = new SaasPlaybooksService(makeDb([]));
    const probs = await svc.getStageProbabilities(T);
    expect(probs).toMatchObject(DEFAULT_STAGE_PROBS);
  });

  it("merges tenant overrides over defaults", async () => {
    const db = makeDb([{ stage: "contacted", probability: "80" }]);
    const svc = new SaasPlaybooksService(db);
    const probs = await svc.getStageProbabilities(T);
    expect(probs.contacted).toBe(80);
    expect(probs.new).toBe(10); // default preserved
  });
});

describe("upsertStageProbability", () => {
  it("calls DB with correct params", async () => {
    const db = makeDb([]);
    const svc = new SaasPlaybooksService(db);
    await svc.upsertStageProbability(T, "qualified", 60);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO saas_stage_probabilities"), [T, "qualified", 60]);
  });

  it("throws VALIDATION for probability > 100", async () => {
    const svc = new SaasPlaybooksService(makeDb([]));
    await expect(svc.upsertStageProbability(T, "new", 101)).rejects.toThrow(SaasPlaybooksError);
  });

  it("throws VALIDATION for negative probability", async () => {
    const svc = new SaasPlaybooksService(makeDb([]));
    await expect(svc.upsertStageProbability(T, "new", -1)).rejects.toThrow(SaasPlaybooksError);
  });
});

describe("list", () => {
  it("returns empty array when no playbooks", async () => {
    const svc = new SaasPlaybooksService(makeDb([]));
    expect(await svc.list(T)).toEqual([]);
  });

  it("returns playbooks with actions loaded", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([pbRow]) // playbooks list
      .mockResolvedValueOnce([actRow]); // actions batch
    const svc = new SaasPlaybooksService(db);
    const list = await svc.list(T);
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe("Follow-up");
    expect(list[0]!.actions).toHaveLength(1);
    expect(list[0]!.actions[0]!.title).toBe("Send email");
  });

  it("filters by stage when provided", async () => {
    const db = makeDb([]);
    const svc = new SaasPlaybooksService(db);
    await svc.list(T, "contacted");
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("stage = $2"), [T, "contacted"]);
  });
});

describe("get", () => {
  it("throws NOT_FOUND when missing", async () => {
    const svc = new SaasPlaybooksService(makeDb([]));
    await expect(svc.get(T, "missing-id")).rejects.toThrow(SaasPlaybooksError);
  });

  it("returns playbook with actions", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([pbRow])
      .mockResolvedValueOnce([actRow]);
    const svc = new SaasPlaybooksService(db);
    const pb = await svc.get(T, "pb-1");
    expect(pb.id).toBe("pb-1");
    expect(pb.actions[0]!.actionType).toBe("task");
  });
});

describe("create", () => {
  it("throws VALIDATION when name is empty", async () => {
    const svc = new SaasPlaybooksService(makeDb([]));
    await expect(svc.create(T, { name: "  ", stage: "new" })).rejects.toThrow(SaasPlaybooksError);
  });

  it("creates playbook without actions", async () => {
    const db = makeDb([pbRow]);
    const svc = new SaasPlaybooksService(db);
    const pb = await svc.create(T, { name: "Follow-up", stage: "contacted" });
    expect(pb.name).toBe("Follow-up");
    expect(pb.actions).toHaveLength(0);
  });

  it("creates playbook with actions sequentially", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([pbRow])
      .mockResolvedValueOnce([actRow]);
    const svc = new SaasPlaybooksService(db);
    const pb = await svc.create(T, { name: "Follow-up", stage: "contacted", actions: [{ actionType: "task", title: "Send email" }] });
    expect(pb.actions).toHaveLength(1);
  });
});

describe("update", () => {
  it("throws NOT_FOUND when missing", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    const svc = new SaasPlaybooksService(db);
    await expect(svc.update(T, "missing", { name: "X" })).rejects.toThrow(SaasPlaybooksError);
  });

  it("returns updated playbook", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ ...pbRow, name: "Updated" }]) // UPDATE
      .mockResolvedValueOnce([{ ...pbRow, name: "Updated" }]) // get()
      .mockResolvedValueOnce([]); // actions
    const svc = new SaasPlaybooksService(db);
    const pb = await svc.update(T, "pb-1", { name: "Updated" });
    expect(pb.name).toBe("Updated");
  });
});

describe("delete", () => {
  it("throws NOT_FOUND when missing", async () => {
    const svc = new SaasPlaybooksService(makeDb([]));
    await expect(svc.delete(T, "missing")).rejects.toThrow(SaasPlaybooksError);
  });

  it("succeeds when found", async () => {
    const db = makeDb([{ id: "pb-1" }]);
    const svc = new SaasPlaybooksService(db);
    await expect(svc.delete(T, "pb-1")).resolves.toBeUndefined();
  });
});

describe("getForecast", () => {
  it("returns zero totals with no open deals", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([]) // getStageProbabilities
      .mockResolvedValueOnce([]); // deals
    const svc = new SaasPlaybooksService(db);
    const f = await svc.getForecast(T);
    expect(f.weightedTotal).toBe(0);
    expect(f.bestCase).toBe(0);
    expect(f.committed).toBe(0);
    expect(f.byStage).toHaveLength(0);
  });

  it("calculates weighted values using default probabilities", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([]) // no prob overrides
      .mockResolvedValueOnce([{ stage: "proposal", cnt: "2", total: "10000" }]);
    const svc = new SaasPlaybooksService(db);
    const f = await svc.getForecast(T);
    // proposal = 75% → weighted = 10000 * 75/100 = 7500
    expect(f.weightedTotal).toBe(7500);
    expect(f.bestCase).toBe(10000);
    expect(f.committed).toBe(10000); // proposal >= 75
  });

  it("uses tenant probability overrides", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ stage: "new", probability: "50" }]) // override new → 50%
      .mockResolvedValueOnce([{ stage: "new", cnt: "1", total: "1000" }]);
    const svc = new SaasPlaybooksService(db);
    const f = await svc.getForecast(T);
    expect(f.weightedTotal).toBe(500); // 1000 * 50/100
    expect(f.committed).toBe(0); // 50 < 75
  });
});
