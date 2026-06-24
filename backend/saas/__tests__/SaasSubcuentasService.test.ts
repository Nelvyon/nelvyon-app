import { describe, it, expect, vi } from "vitest";
import { SaasSubcuentasService } from "../SaasSubcuentasService";

type Row = Record<string, unknown>;

const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const AGENCY = "agency-tenant-1";

const baseSub: Row = {
  id: "sub-uuid-1",
  agencyTenantId: AGENCY,
  tenantId: "sub_abc123",
  name: "Cliente A",
  email: "clientea@test.com",
  plan: "starter",
  status: "active",
  maxContacts: 1000,
  maxCampaigns: 5,
  stripeConnectPaymentEnabled: false,
  notes: null,
  createdAt: "2026-06-24T00:00:00.000Z",
  updatedAt: "2026-06-24T00:00:00.000Z",
};

describe("SaasSubcuentasService — list", () => {
  it("returns empty array", async () => {
    const db = makeDb([[]]);
    expect(await new SaasSubcuentasService({ db }).list(AGENCY)).toEqual([]);
  });

  it("returns mapped subcuentas", async () => {
    const db = makeDb([[baseSub]]);
    const [s] = await new SaasSubcuentasService({ db }).list(AGENCY);
    expect(s.name).toBe("Cliente A");
    expect(s.plan).toBe("starter");
    expect(s.maxContacts).toBe(1000);
  });

  it("passes status filter", async () => {
    const db = makeDb([[]]);
    const svc = new SaasSubcuentasService({ db });
    await svc.list(AGENCY, "suspended");
    expect(String(db.query.mock.calls[0][0])).toContain("status = $2");
  });
});

describe("SaasSubcuentasService — get", () => {
  it("returns null when not found", async () => {
    const db = makeDb([[]]);
    expect(await new SaasSubcuentasService({ db }).get(AGENCY, "nope")).toBeNull();
  });

  it("returns subcuenta", async () => {
    const db = makeDb([[baseSub]]);
    const s = await new SaasSubcuentasService({ db }).get(AGENCY, "sub-uuid-1");
    expect(s?.tenantId).toBe("sub_abc123");
  });
});

describe("SaasSubcuentasService — create", () => {
  it("throws VALIDATION when name empty", async () => {
    const db = makeDb();
    await expect(new SaasSubcuentasService({ db }).create(AGENCY, { name: "", email: "a@b.com" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION when email invalid", async () => {
    const db = makeDb();
    await expect(new SaasSubcuentasService({ db }).create(AGENCY, { name: "X", email: "notanemail" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("creates subcuenta with starter limits", async () => {
    const db = makeDb([[baseSub]]);
    const svc = new SaasSubcuentasService({ db });
    const s = await svc.create(AGENCY, { name: "Cliente A", email: "clientea@test.com" });
    expect(s.name).toBe("Cliente A");
    const insertCall = db.query.mock.calls[0];
    const sql = String(insertCall[0]);
    expect(sql).toContain("INSERT INTO saas_subcuentas");
    const params = insertCall[1] as unknown[];
    expect(params[4]).toBe("starter"); // plan
    expect(params[5]).toBe(1000);      // max_contacts
    expect(params[6]).toBe(5);         // max_campaigns
  });

  it("creates subcuenta with pro limits when plan=pro", async () => {
    const db = makeDb([[{ ...baseSub, plan: "pro", maxContacts: 10000, maxCampaigns: 25 }]]);
    const svc = new SaasSubcuentasService({ db });
    await svc.create(AGENCY, { name: "Pro Client", email: "pro@test.com", plan: "pro" });
    const params = db.query.mock.calls[0][1] as unknown[];
    expect(params[4]).toBe("pro");
    expect(params[5]).toBe(10000);
    expect(params[6]).toBe(25);
  });

  it("generates unique tenantId starting with sub_", async () => {
    const db = makeDb([[baseSub]]);
    const svc = new SaasSubcuentasService({ db });
    await svc.create(AGENCY, { name: "X", email: "x@test.com" });
    const params = db.query.mock.calls[0][1] as unknown[];
    expect(String(params[1])).toMatch(/^sub_/);
  });
});

describe("SaasSubcuentasService — suspend", () => {
  it("returns null when not found or not active", async () => {
    const db = makeDb([[]]);
    expect(await new SaasSubcuentasService({ db }).suspend(AGENCY, "nope")).toBeNull();
  });

  it("sets status to suspended", async () => {
    const db = makeDb([[{ ...baseSub, status: "suspended" }]]);
    const s = await new SaasSubcuentasService({ db }).suspend(AGENCY, "sub-uuid-1");
    expect(s?.status).toBe("suspended");
    expect(String(db.query.mock.calls[0][0])).toContain("status='suspended'");
  });
});

describe("SaasSubcuentasService — reactivate", () => {
  it("returns null when not suspended", async () => {
    const db = makeDb([[]]);
    expect(await new SaasSubcuentasService({ db }).reactivate(AGENCY, "nope")).toBeNull();
  });

  it("sets status to active", async () => {
    const db = makeDb([[{ ...baseSub, status: "active" }]]);
    const s = await new SaasSubcuentasService({ db }).reactivate(AGENCY, "sub-uuid-1");
    expect(s?.status).toBe("active");
  });
});

describe("SaasSubcuentasService — cancel", () => {
  it("returns false when not suspended", async () => {
    const db = makeDb([[]]);
    expect(await new SaasSubcuentasService({ db }).cancel(AGENCY, "sub-uuid-1")).toBe(false);
  });

  it("returns true when cancelled", async () => {
    const db = makeDb([[{ id: "sub-uuid-1" }]]);
    expect(await new SaasSubcuentasService({ db }).cancel(AGENCY, "sub-uuid-1")).toBe(true);
  });
});

describe("SaasSubcuentasService — getUsage", () => {
  it("returns null when subcuenta not found", async () => {
    const db = makeDb([[]]);
    expect(await new SaasSubcuentasService({ db }).getUsage(AGENCY, "nope")).toBeNull();
  });

  it("returns usage counts", async () => {
    // get sub → then 3 parallel COUNT queries
    const db = makeDb([
      [baseSub],
      [{ count: "150" }], // contacts
      [{ count: "3" }],   // campaigns
      [{ count: "2" }],   // workflows
    ]);
    const usage = await new SaasSubcuentasService({ db }).getUsage(AGENCY, "sub-uuid-1");
    expect(usage?.contacts).toBe(150);
    expect(usage?.campaigns).toBe(3);
    expect(usage?.workflows).toBe(2);
  });
});
