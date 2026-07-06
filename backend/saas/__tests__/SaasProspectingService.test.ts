import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SaasProspectingService,
  SaasProspectingError,
  isApolloConfigured,
  resetSaasProspectingServiceForTests,
} from "../SaasProspectingService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-a";

describe("SaasProspectingService", () => {
  beforeEach(() => {
    resetSaasProspectingServiceForTests();
    delete process.env.APOLLO_API_KEY;
  });

  it("isConfigured is false without APOLLO_API_KEY", () => {
    expect(isApolloConfigured()).toBe(false);
  });

  it("listLists returns empty when no lists", async () => {
    const db = makeDb([[]]);
    const svc = new SaasProspectingService(db);
    const lists = await svc.listLists(TENANT);
    expect(lists).toEqual([]);
  });

  it("searchAndCreateList rejects without API key", async () => {
    const db = makeDb();
    const svc = new SaasProspectingService(db);
    await expect(
      svc.searchAndCreateList(TENANT, "Test list", { jobTitle: "CEO" }),
    ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("searchAndCreateList rejects empty name", async () => {
    process.env.APOLLO_API_KEY = "test-key";
    const db = makeDb();
    const svc = new SaasProspectingService(db);
    await expect(svc.searchAndCreateList(TENANT, "  ", {})).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("syncToCrm requires prospectIds", async () => {
    const db = makeDb();
    const svc = new SaasProspectingService(db);
    await expect(svc.syncToCrm(TENANT, [])).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("listProspects maps rows to API shape", async () => {
    const row = {
      id: "p1",
      tenant_id: TENANT,
      list_id: "l1",
      apollo_person_id: "apollo-1",
      name: "Ana García",
      title: "CMO",
      company: "Acme",
      industry: "Tech",
      country: "ES",
      employees: 50,
      email: "ana@acme.com",
      linkedin_url: "https://linkedin.com/in/ana",
      phone: null,
      enriched: true,
      added_to_crm: false,
      crm_contact_id: null,
    };
    const db = makeDb([[row]]);
    const svc = new SaasProspectingService(db);
    const prospects = await svc.listProspects(TENANT, "l1");
    expect(prospects[0]).toMatchObject({
      id: "p1",
      name: "Ana García",
      email: "ana@acme.com",
      enriched: true,
      addedToCrm: false,
    });
  });
});

describe("SaasProspectingError", () => {
  it("has expected name", () => {
    const err = new SaasProspectingError("fail", "APOLLO_ERROR");
    expect(err.name).toBe("SaasProspectingError");
  });
});
