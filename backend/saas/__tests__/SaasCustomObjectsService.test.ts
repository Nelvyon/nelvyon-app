import { describe, it, expect, vi } from "vitest";
import { SaasCustomObjectsService } from "../SaasCustomObjectsService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => { let c = 0; return { query: vi.fn(async () => rows[c++] ?? []) }; };
const TENANT = "tenant-co";

const baseObj: Row = {
  id: "obj-1", tenantId: TENANT, name: "Deal", pluralName: "Deals",
  icon: "💼", fields: [{ name: "value", type: "number", label: "Value" }],
  recordsCount: 0, createdAt: "2026-06-24T00:00:00Z",
};

const baseRec: Row = {
  id: "rec-1", objectId: "obj-1", tenantId: TENANT,
  data: { value: 1000 }, createdAt: "2026-06-24T00:00:00Z", updatedAt: "2026-06-24T00:00:00Z",
};

describe("SaasCustomObjectsService — listObjects", () => {
  it("returns empty array", async () => {
    expect(await new SaasCustomObjectsService({ db: makeDb([[]]) }).listObjects(TENANT)).toEqual([]);
  });
  it("maps object row", async () => {
    const [o] = await new SaasCustomObjectsService({ db: makeDb([[baseObj]]) }).listObjects(TENANT);
    expect(o.name).toBe("Deal");
    expect(o.fields).toHaveLength(1);
    expect(o.recordsCount).toBe(0);
  });
});

describe("SaasCustomObjectsService — getObject", () => {
  it("returns null when not found", async () => {
    expect(await new SaasCustomObjectsService({ db: makeDb([[]]) }).getObject(TENANT, "x")).toBeNull();
  });
  it("returns object", async () => {
    const o = await new SaasCustomObjectsService({ db: makeDb([[baseObj]]) }).getObject(TENANT, "obj-1");
    expect(o?.pluralName).toBe("Deals");
  });
});

describe("SaasCustomObjectsService — createObject", () => {
  it("throws VALIDATION when name empty", async () => {
    await expect(new SaasCustomObjectsService({ db: makeDb() }).createObject(TENANT, { name: "" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
  it("creates object with default pluralName", async () => {
    const db = makeDb([[{ ...baseObj, name: "Vehicle", pluralName: "Vehicles" }]]);
    const o = await new SaasCustomObjectsService({ db }).createObject(TENANT, { name: "Vehicle" });
    expect(o.name).toBe("Vehicle");
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("INSERT INTO custom_objects");
  });
});

describe("SaasCustomObjectsService — updateObject", () => {
  it("returns null when not found", async () => {
    expect(await new SaasCustomObjectsService({ db: makeDb([[]]) }).updateObject(TENANT, "x", { icon: "🚗" })).toBeNull();
  });
  it("updates icon", async () => {
    const db = makeDb([[{ ...baseObj, icon: "🚗" }]]);
    const o = await new SaasCustomObjectsService({ db }).updateObject(TENANT, "obj-1", { icon: "🚗" });
    expect(o?.icon).toBe("🚗");
  });
});

describe("SaasCustomObjectsService — deleteObject", () => {
  it("returns false when not found", async () => {
    expect(await new SaasCustomObjectsService({ db: makeDb([[]]) }).deleteObject(TENANT, "x")).toBe(false);
  });
  it("returns true", async () => {
    expect(await new SaasCustomObjectsService({ db: makeDb([[{ id: "obj-1" }]]) }).deleteObject(TENANT, "obj-1")).toBe(true);
  });
});

describe("SaasCustomObjectsService — listRecords", () => {
  it("returns records for object", async () => {
    const [r] = await new SaasCustomObjectsService({ db: makeDb([[baseRec]]) }).listRecords(TENANT, "obj-1");
    expect(r.data).toEqual({ value: 1000 });
  });
});

describe("SaasCustomObjectsService — createRecord", () => {
  it("creates record and increments count", async () => {
    const db = makeDb([[baseRec]]);
    const r = await new SaasCustomObjectsService({ db }).createRecord(TENANT, "obj-1", { value: 2000 });
    expect(r.id).toBe("rec-1");
    const sql = String(db.query.mock.calls[0][0]);
    expect(sql).toContain("INSERT INTO custom_object_records");
    expect(sql).toContain("records_count + 1");
  });
});

describe("SaasCustomObjectsService — updateRecord", () => {
  it("returns null when not found", async () => {
    expect(await new SaasCustomObjectsService({ db: makeDb([[]]) }).updateRecord(TENANT, "obj-1", "x", {})).toBeNull();
  });
  it("updates record data", async () => {
    const db = makeDb([[{ ...baseRec, data: { value: 3000 } }]]);
    const r = await new SaasCustomObjectsService({ db }).updateRecord(TENANT, "obj-1", "rec-1", { value: 3000 });
    expect(r?.data).toEqual({ value: 3000 });
  });
});

describe("SaasCustomObjectsService — deleteRecord", () => {
  it("returns false when not found", async () => {
    expect(await new SaasCustomObjectsService({ db: makeDb([[]]) }).deleteRecord(TENANT, "obj-1", "x")).toBe(false);
  });
  it("deletes record and decrements count", async () => {
    const db = makeDb([[{ id: "rec-1" }]]);
    expect(await new SaasCustomObjectsService({ db }).deleteRecord(TENANT, "obj-1", "rec-1")).toBe(true);
    expect(String(db.query.mock.calls[0][0])).toContain("records_count - 1");
  });
});
