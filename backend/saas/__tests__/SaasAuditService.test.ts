import { describe, it, expect, vi } from "vitest";
import { SaasAuditService } from "../SaasAuditService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => { let c = 0; return { query: vi.fn(async () => rows[c++] ?? []) }; };
const TENANT = "tenant-audit";

const baseEntry: Row = {
  id: "log-1", tenantId: TENANT, userId: "user-1", userEmail: "admin@test.com",
  action: "create", module: "crm", resourceId: "contact-1", resourceType: "contact",
  details: { name: "Test" }, ipAddress: "127.0.0.1", userAgent: "Mozilla/5.0",
  createdAt: "2026-06-24T00:00:00Z",
};

describe("SaasAuditService — log", () => {
  it("inserts audit log entry", async () => {
    const db = makeDb([[]]);
    await new SaasAuditService({ db }).log(TENANT, {
      action: "create", module: "crm", userId: "user-1", resourceId: "c-1", resourceType: "contact",
    });
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("INSERT INTO audit_logs");
    const params = db.query.mock.calls[0][1] as unknown[];
    expect(params[3]).toBe("create");
    expect(params[4]).toBe("crm");
  });

  it("handles missing optional fields gracefully", async () => {
    const db = makeDb([[]]);
    await new SaasAuditService({ db }).log(TENANT, { action: "view", module: "billing" });
    const params = db.query.mock.calls[0][1] as unknown[];
    expect(params[1]).toBeNull(); // userId
    expect(params[2]).toBeNull(); // userEmail
  });
});

describe("SaasAuditService — list", () => {
  it("returns empty array", async () => {
    expect(await new SaasAuditService({ db: makeDb([[]]) }).list(TENANT)).toEqual([]);
  });

  it("maps audit log row correctly", async () => {
    const [e] = await new SaasAuditService({ db: makeDb([[baseEntry]]) }).list(TENANT);
    expect(e.action).toBe("create");
    expect(e.module).toBe("crm");
    expect(e.userEmail).toBe("admin@test.com");
    expect(e.details).toEqual({ name: "Test" });
  });

  it("applies module filter", async () => {
    const db = makeDb([[]]);
    await new SaasAuditService({ db }).list(TENANT, { module: "billing" });
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("module = $");
    const params = db.query.mock.calls[0][1] as unknown[];
    expect(params).toContain("billing");
  });

  it("applies date range filters", async () => {
    const db = makeDb([[]]);
    await new SaasAuditService({ db }).list(TENANT, { from: "2026-01-01", to: "2026-12-31" });
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("created_at >=");
    expect(sql).toContain("created_at <=");
  });

  it("caps limit at 200", async () => {
    const db = makeDb([[]]);
    await new SaasAuditService({ db }).list(TENANT, { limit: 9999 });
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("LIMIT 200");
  });
});

describe("SaasAuditService — getModuleStats", () => {
  it("returns stats grouped by module", async () => {
    const db = makeDb([[
      { module: "crm", count: "42" },
      { module: "billing", count: "10" },
    ]]);
    const stats = await new SaasAuditService({ db }).getModuleStats(TENANT);
    expect(stats).toHaveLength(2);
    expect(stats[0]).toEqual({ module: "crm", count: 42 });
    expect(stats[1]).toEqual({ module: "billing", count: 10 });
  });

  it("returns empty when no logs", async () => {
    expect(await new SaasAuditService({ db: makeDb([[]]) }).getModuleStats(TENANT)).toEqual([]);
  });
});
