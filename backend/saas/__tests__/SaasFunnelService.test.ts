import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasFunnelService, SaasFunnelError, resetSaasFunnelServiceForTests } from "../SaasFunnelService";

beforeEach(() => { resetSaasFunnelServiceForTests(); });

const funnelRow = {
  id: "f1", tenant_id: "t1", name: "Test Funnel", description: null,
  status: "draft", slug: "test-funnel", steps_count: 0,
  created_at: new Date(), updated_at: new Date(),
};
const stepRow = {
  id: "s1", funnel_id: "f1", tenant_id: "t1", step_order: 0,
  type: "landing", name: "Landing Page", content: null,
  cta_label: null, cta_url: null, visitors: 0, conversions: 0,
  created_at: new Date(), updated_at: new Date(),
};

function makeDb(funnels: unknown[] = [], steps: unknown[] = []) {
  let insertCount = 0;
  return {
    query: vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM saas_funnels") && sql.includes("WHERE tenant_id=$1 AND id=$2")) {
        return funnels.length ? funnels : [];
      }
      if (sql.includes("FROM saas_funnels")) return funnels;
      if (sql.includes("FROM saas_funnel_steps")) return steps;
      if (sql.includes("INSERT INTO saas_funnels")) return [{ ...funnelRow, steps_count: 0 }];
      if (sql.includes("INSERT INTO saas_funnel_steps")) { insertCount++; return []; }
      if (sql.includes("UPDATE saas_funnels")) return [];
      if (sql.includes("DELETE FROM saas_funnels")) return funnels.length ? [{ id: "f1" }] : [];
      return [];
    }),
    _insertCount: () => insertCount,
  };
}

describe("SaasFunnelService.list", () => {
  it("returns empty array for tenant with no funnels", async () => {
    const svc = new SaasFunnelService(makeDb() as never);
    expect(await svc.list("t1")).toEqual([]);
  });

  it("returns funnels with steps", async () => {
    const db = makeDb([funnelRow], [stepRow]);
    const svc = new SaasFunnelService(db as never);
    const funnels = await svc.list("t1");
    expect(funnels).toHaveLength(1);
    expect(funnels[0].steps).toHaveLength(1);
    expect(funnels[0].name).toBe("Test Funnel");
  });
});

describe("SaasFunnelService.create", () => {
  it("throws VALIDATION for empty name", async () => {
    const svc = new SaasFunnelService(makeDb() as never);
    await expect(svc.create("t1", { name: "  " }))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });

  it("creates funnel with default 3 steps", async () => {
    // For get() after create, return funnelRow + stepRow
    let getCallCount = 0;
    const db = {
      query: vi.fn().mockImplementation(async (sql: string) => {
        if (sql.includes("INSERT INTO saas_funnels")) return [{ ...funnelRow, id: "f-new" }];
        if (sql.includes("INSERT INTO saas_funnel_steps")) return [];
        if (sql.includes("UPDATE saas_funnels")) return [];
        if (sql.includes("FROM saas_funnels") && sql.includes("id=$2")) {
          getCallCount++;
          return [{ ...funnelRow, id: "f-new", steps_count: 3 }];
        }
        if (sql.includes("FROM saas_funnel_steps")) return [stepRow];
        return [];
      }),
    };
    const svc = new SaasFunnelService(db as never);
    const funnel = await svc.create("t1", { name: "Mi funnel" });
    expect(funnel.id).toBe("f-new");
    expect(getCallCount).toBeGreaterThan(0);
  });

  it("throws VALIDATION for invalid step type", async () => {
    const svc = new SaasFunnelService(makeDb() as never);
    await expect(svc.create("t1", {
      name: "Test",
      steps: [{ type: "invalid" as never, name: "Bad step" }],
    })).rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });
});

describe("SaasFunnelService.publish", () => {
  it("throws NOT_FOUND for non-existent funnel", async () => {
    const svc = new SaasFunnelService(makeDb() as never);
    await expect(svc.publish("t1", "nonexistent"))
      .rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("throws VALIDATION when no steps", async () => {
    const db = makeDb([{ ...funnelRow, steps_count: 0 }], []);
    const svc = new SaasFunnelService(db as never);
    await expect(svc.publish("t1", "f1"))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });
});

describe("SaasFunnelService.delete", () => {
  it("throws NOT_FOUND for missing funnel", async () => {
    const svc = new SaasFunnelService(makeDb() as never);
    await expect(svc.delete("t1", "no-id"))
      .rejects.toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("deletes existing funnel", async () => {
    const db = makeDb([funnelRow]);
    const svc = new SaasFunnelService(db as never);
    await expect(svc.delete("t1", "f1")).resolves.toBeUndefined();
  });
});

describe("SaasFunnelService.addStep", () => {
  it("throws VALIDATION for invalid step type", async () => {
    const db = makeDb([funnelRow], []);
    const svc = new SaasFunnelService(db as never);
    await expect(svc.addStep("t1", "f1", { type: "bad" as never, name: "x" }))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });
});

describe("SaasFunnelError", () => {
  it("is instance of Error", () => {
    const e = new SaasFunnelError("test", "TEST");
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("TEST");
  });
});
