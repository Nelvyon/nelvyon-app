import { describe, it, expect, vi } from "vitest";
import { SaasAbTestingService } from "../SaasAbTestingService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-ab";
const now = new Date();

const variants = [
  { id: "var_0", label: "A", value: "Subject A", sends: 100, opens: 30, clicks: 10, openRate: 30, clickRate: 10 },
  { id: "var_1", label: "B", value: "Subject B", sends: 100, opens: 20, clicks: 8, openRate: 20, clickRate: 8 },
];

const testRow = {
  id: "ab1", tenant_id: TENANT, name: "My Test", type: "subject_line",
  status: "running", variants, winner_variant_id: null, confidence: null, created_at: now,
};

describe("SaasAbTestingService", () => {
  it("list returns empty", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAbTestingService(db);
    expect(await svc.list(TENANT)).toEqual([]);
  });

  it("create requires name", async () => {
    const db = makeDb();
    const svc = new SaasAbTestingService(db);
    await expect(svc.create(TENANT, { name: "", variants: [{ label: "A", value: "a" }, { label: "B", value: "b" }] })).rejects.toThrow("name");
  });

  it("create requires at least 2 variants", async () => {
    const db = makeDb();
    const svc = new SaasAbTestingService(db);
    await expect(svc.create(TENANT, { name: "Test", variants: [{ label: "A", value: "a" }] })).rejects.toThrow("2 variants");
  });

  it("create rejects invalid type", async () => {
    const db = makeDb();
    const svc = new SaasAbTestingService(db);
    await expect(svc.create(TENANT, {
      name: "Test", type: "magic" as "subject_line",
      variants: [{ label: "A", value: "a" }, { label: "B", value: "b" }],
    })).rejects.toThrow("type");
  });

  it("create inserts and returns test", async () => {
    const db = makeDb([[testRow]]);
    const svc = new SaasAbTestingService(db);
    const test = await svc.create(TENANT, {
      name: "My Test",
      variants: [{ label: "A", value: "Subject A" }, { label: "B", value: "Subject B" }],
    });
    expect(test.id).toBe("ab1");
    expect(test.status).toBe("running");
    expect(test.variants).toHaveLength(2);
  });

  it("declareWinner picks highest open rate", async () => {
    const winner = { ...testRow, status: "completed", winner_variant_id: "var_0", confidence: 65 };
    const db = makeDb([[testRow], [winner]]);
    const svc = new SaasAbTestingService(db);
    const result = await svc.declareWinner(TENANT, "ab1");
    expect(result.winnerVariantId).toBe("var_0");
    expect(result.status).toBe("completed");
  });

  it("declareWinner throws if no sends", async () => {
    const noSends = { ...testRow, variants: variants.map((v) => ({ ...v, sends: 0 })) };
    const db = makeDb([[noSends]]);
    const svc = new SaasAbTestingService(db);
    await expect(svc.declareWinner(TENANT, "ab1")).rejects.toThrow("No data");
  });

  it("delete throws NOT_FOUND for missing", async () => {
    const db = makeDb([[]]);
    const svc = new SaasAbTestingService(db);
    await expect(svc.delete(TENANT, "x")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
