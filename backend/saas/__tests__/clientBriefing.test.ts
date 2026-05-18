// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientBriefingService, resetClientBriefingServiceForTests } from "../ClientBriefingService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const BRIEFING_ID = "00000000-0000-0000-0000-0000000000bb";

const INPUT = {
  companyName: "Acme",
  website: "https://acme.test",
  industry: "SaaS",
  description: "CRM software",
  targetAudience: "SMBs",
  goals: ["increase leads", "improve conversion"],
};

const RESULT = {
  summary: "Resumen",
  businessAnalysis: "Analisis",
  competitors: ["Comp A", "Comp B"],
  targetAudience: "SMBs",
  recommendedChannels: ["SEO", "Ads"],
  actionPlan: ["Paso 1", "Paso 2"],
  strengths: ["Marca"],
  opportunities: ["Nicho"],
  estimatedBudget: { min: 1000, max: 3000 },
};

describe("ClientBriefingService", () => {
  beforeEach(() => {
    resetClientBriefingServiceForTests();
    vi.clearAllMocks();
  });

  it("generateBriefing usa LLM y parsea salida", async () => {
    const llm = { complete: vi.fn().mockResolvedValue(JSON.stringify(RESULT)) };
    const svc = new ClientBriefingService({ db: { query: vi.fn() }, llm });
    const out = await svc.generateBriefing(USER_ID, INPUT);
    expect(out.summary).toBe("Resumen");
    expect(out.estimatedBudget.min).toBe(1000);
  });

  it("saveBriefing guarda briefing", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      { id: BRIEFING_ID, user_id: USER_ID, company_name: "Acme", input: INPUT, result: RESULT, created_at: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    const svc = new ClientBriefingService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.saveBriefing(USER_ID, INPUT, RESULT);
    expect(out.id).toBe(BRIEFING_ID);
    expect(String(query.mock.calls[0][0])).toContain("INSERT INTO client_briefings");
  });

  it("getBriefings devuelve lista ordenada", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      { id: BRIEFING_ID, user_id: USER_ID, company_name: "Acme", input: INPUT, result: RESULT, created_at: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    const svc = new ClientBriefingService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getBriefings(USER_ID);
    expect(out).toHaveLength(1);
  });

  it("getBriefing devuelve detalle por id", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      { id: BRIEFING_ID, user_id: USER_ID, company_name: "Acme", input: INPUT, result: RESULT, created_at: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    const svc = new ClientBriefingService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getBriefing(BRIEFING_ID, USER_ID);
    expect(out?.companyName).toBe("Acme");
  });
});
