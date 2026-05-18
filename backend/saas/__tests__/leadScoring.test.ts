// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LeadScoringService, resetLeadScoringServiceForTests } from "../LeadScoringService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const LEAD_ID = "00000000-0000-0000-0000-0000000000bb";

const BASE_LEAD = {
  name: "Ana Lead",
  email: "ana@example.com",
  company: "Acme",
  source: "referral",
  pagesVisited: 8,
  timeOnSite: 22,
  emailOpens: 4,
  industry: "saas",
};

describe("LeadScoringService", () => {
  beforeEach(() => {
    resetLeadScoringServiceForTests();
    vi.clearAllMocks();
  });

  it("scoreLead hot/warm/cold", async () => {
    const llmHot = { complete: vi.fn().mockResolvedValue(`{"score":85,"category":"hot","reasons":["High intent"],"nextAction":"Call now"}`) };
    const svcHot = new LeadScoringService({ db: { query: vi.fn() }, llm: llmHot });
    const hot = await svcHot.scoreLead(USER_ID, BASE_LEAD);
    expect(hot.category).toBe("hot");

    const llmWarm = { complete: vi.fn().mockResolvedValue(`{"score":55,"category":"warm","reasons":["Medium intent"],"nextAction":"Email follow-up"}`) };
    const svcWarm = new LeadScoringService({ db: { query: vi.fn() }, llm: llmWarm });
    const warm = await svcWarm.scoreLead(USER_ID, BASE_LEAD);
    expect(warm.category).toBe("warm");

    const llmCold = { complete: vi.fn().mockResolvedValue(`{"score":20,"category":"cold","reasons":["Low activity"],"nextAction":"Nurture sequence"}`) };
    const svcCold = new LeadScoringService({ db: { query: vi.fn() }, llm: llmCold });
    const cold = await svcCold.scoreLead(USER_ID, BASE_LEAD);
    expect(cold.category).toBe("cold");
  });

  it("saveLead guarda con score automático", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: LEAD_ID,
        user_id: USER_ID,
        name: BASE_LEAD.name,
        email: BASE_LEAD.email,
        company: BASE_LEAD.company,
        data: BASE_LEAD,
        score: "82",
        category: "hot",
        reasons: ["High intent"],
        next_action: "Call now",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const llm = { complete: vi.fn().mockResolvedValue(`{"score":82,"category":"hot","reasons":["High intent"],"nextAction":"Call now"}`) };
    const svc = new LeadScoringService({ db: { query }, llm });
    const out = await svc.saveLead(USER_ID, BASE_LEAD);
    expect(out.score).toBe(82);
    expect(String(query.mock.calls[0][0])).toContain("INSERT INTO scored_leads");
  });

  it("updateLeadScore recalcula score existente", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: LEAD_ID,
          user_id: USER_ID,
          name: BASE_LEAD.name,
          email: BASE_LEAD.email,
          company: BASE_LEAD.company,
          data: BASE_LEAD,
          created_at: new Date("2026-01-01T00:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: LEAD_ID,
          user_id: USER_ID,
          name: BASE_LEAD.name,
          email: BASE_LEAD.email,
          company: BASE_LEAD.company,
          data: BASE_LEAD,
          score: "74",
          category: "hot",
          reasons: ["Updated intent"],
          next_action: "Call now",
          created_at: new Date("2026-01-01T00:00:00.000Z"),
          updated_at: new Date("2026-01-02T00:00:00.000Z"),
        },
      ]);
    const llm = { complete: vi.fn().mockResolvedValue(`{"score":74,"category":"hot","reasons":["Updated intent"],"nextAction":"Call now"}`) };
    const svc = new LeadScoringService({ db: { query }, llm });
    const out = await svc.updateLeadScore(LEAD_ID, USER_ID);
    expect(out?.score).toBe(74);
  });

  it("getLeads devuelve paginado con filtros", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ total: "1" }])
      .mockResolvedValueOnce([
        {
          id: LEAD_ID,
          user_id: USER_ID,
          name: BASE_LEAD.name,
          email: BASE_LEAD.email,
          company: BASE_LEAD.company,
          data: BASE_LEAD,
          score: "61",
          category: "warm",
          reasons: ["ok"],
          next_action: "Email follow-up",
          created_at: new Date("2026-01-01T00:00:00.000Z"),
          updated_at: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]);
    const svc = new LeadScoringService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getLeads(USER_ID, { category: "warm", page: 1, pageSize: 20 });
    expect(out.total).toBe(1);
    expect(out.items[0].category).toBe("warm");
  });

  it("getStats agrega distribución y top leads", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ total: "10", avg_score: "57.2", hot: "3", warm: "4", cold: "3" }])
      .mockResolvedValueOnce([{ id: LEAD_ID, name: "Ana Lead", email: "ana@example.com", score: "90", category: "hot", next_action: "Call now" }]);
    const svc = new LeadScoringService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getStats(USER_ID);
    expect(out.totalLeads).toBe(10);
    expect(out.topLeads[0].score).toBe(90);
  });
});
