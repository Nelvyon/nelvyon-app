import { describe, it, expect, vi } from "vitest";
import { SaasCountdownService } from "../SaasCountdownService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => { let c = 0; return { query: vi.fn(async () => rows[c++] ?? []) }; };
const TENANT = "tenant-cd";

const baseTimer: Row = {
  id: "cd-1", tenantId: TENANT, name: "Black Friday",
  type: "datetime", targetDatetime: "2026-11-28T00:00:00Z",
  durationSeconds: null, evergreenSeconds: null,
  timezone: "Europe/Madrid", actionOnEnd: "hide", actionValue: null,
  scans: 0, createdAt: "2026-06-24T00:00:00Z",
};

describe("SaasCountdownService — list", () => {
  it("returns empty array", async () => {
    expect(await new SaasCountdownService({ db: makeDb([[]]) }).list(TENANT)).toEqual([]);
  });

  it("maps timer row correctly", async () => {
    const [t] = await new SaasCountdownService({ db: makeDb([[baseTimer]]) }).list(TENANT);
    expect(t.name).toBe("Black Friday");
    expect(t.type).toBe("datetime");
    expect(t.actionOnEnd).toBe("hide");
  });
});

describe("SaasCountdownService — get", () => {
  it("returns null when not found", async () => {
    expect(await new SaasCountdownService({ db: makeDb([[]]) }).get(TENANT, "x")).toBeNull();
  });
  it("returns timer", async () => {
    const t = await new SaasCountdownService({ db: makeDb([[baseTimer]]) }).get(TENANT, "cd-1");
    expect(t?.id).toBe("cd-1");
  });
});

describe("SaasCountdownService — create", () => {
  it("throws VALIDATION when name missing", async () => {
    await expect(new SaasCountdownService({ db: makeDb() }).create(TENANT, { name: "", type: "duration", durationSeconds: 300 }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION when datetime type missing targetDatetime", async () => {
    await expect(new SaasCountdownService({ db: makeDb() }).create(TENANT, { name: "X", type: "datetime" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION when duration type missing durationSeconds", async () => {
    await expect(new SaasCountdownService({ db: makeDb() }).create(TENANT, { name: "X", type: "duration" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("creates datetime timer", async () => {
    const db = makeDb([[baseTimer]]);
    const t = await new SaasCountdownService({ db }).create(TENANT, { name: "BF", type: "datetime", targetDatetime: "2026-11-28T00:00:00Z" });
    expect(t.id).toBe("cd-1");
    expect(String(db.query.mock.calls[0][0])).toContain("INSERT INTO countdown_timers");
  });
});

describe("SaasCountdownService — update", () => {
  it("returns null when not found", async () => {
    expect(await new SaasCountdownService({ db: makeDb([[]]) }).update(TENANT, "x", { name: "Y" })).toBeNull();
  });
  it("updates name", async () => {
    const updated = { ...baseTimer, name: "Cyber Monday" };
    const t = await new SaasCountdownService({ db: makeDb([[updated]]) }).update(TENANT, "cd-1", { name: "Cyber Monday" });
    expect(t?.name).toBe("Cyber Monday");
  });
});

describe("SaasCountdownService — delete", () => {
  it("returns false when not found", async () => {
    expect(await new SaasCountdownService({ db: makeDb([[]]) }).delete(TENANT, "x")).toBe(false);
  });
  it("returns true when deleted", async () => {
    expect(await new SaasCountdownService({ db: makeDb([[{ id: "cd-1" }]]) }).delete(TENANT, "cd-1")).toBe(true);
  });
});

describe("SaasCountdownService — trackScan", () => {
  it("calls UPDATE with increment", async () => {
    const db = makeDb([[]]);
    await new SaasCountdownService({ db }).trackScan("cd-1");
    expect(String(db.query.mock.calls[0][0])).toContain("scans = scans + 1");
  });
});
