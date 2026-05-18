// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ColdEmailService,
  getColdEmailService,
  resetColdEmailServiceForTests,
} from "../ColdEmailService";

const USER_ID = "00000000-0000-0000-0000-0000000000ee";
const CAMPAIGN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PROSPECT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const SEQ_JSON = JSON.stringify({
  emails: [
    { step: 1, subject: "S1", body: "B1", sendAfterDays: 0 },
    { step: 2, subject: "S2", body: "B2", sendAfterDays: 2 },
    { step: 3, subject: "S3", body: "B3", sendAfterDays: 3 },
  ],
});

const INPUT = {
  targetCompany: "Acme",
  targetName: "Pat",
  targetRole: "VP",
  targetIndustry: "Tech",
  ourService: "Automación",
  valueProposition: "Ahorro de tiempo",
  senderName: "Yo",
};

describe("ColdEmailService", () => {
  beforeEach(() => {
    resetColdEmailServiceForTests();
    vi.clearAllMocks();
  });

  it("generateSequence parsea JSON del LLM", async () => {
    const llm = { complete: vi.fn().mockResolvedValue(SEQ_JSON) };
    const svc = new ColdEmailService({ db: { query: vi.fn() }, llm });
    const seq = await svc.generateSequence(USER_ID, INPUT);
    expect(seq.emails).toHaveLength(3);
    expect(seq.totalSteps).toBe(3);
    expect(llm.complete).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ temperature: 0.7 }));
  });

  it("createCampaign guarda borrador", async () => {
    const llm = { complete: vi.fn().mockResolvedValue(SEQ_JSON) };
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: CAMPAIGN_ID,
        user_id: USER_ID,
        target_company: "Acme",
        input: INPUT,
        sequence: JSON.parse(SEQ_JSON),
        status: "draft",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new ColdEmailService({ db: { query }, llm });
    const c = await svc.createCampaign(USER_ID, INPUT);
    expect(c.status).toBe("draft");
    expect(String(query.mock.calls[0][0])).toContain("INSERT INTO cold_email_campaigns");
  });

  it("addProspect inserta pending", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: PROSPECT_ID,
        campaign_id: CAMPAIGN_ID,
        user_id: USER_ID,
        name: "X",
        email: "x@test.com",
        company: "Co",
        role: "Dev",
        status: "pending",
        current_step: 0,
        send_at: null,
        sent_at: null,
        replied_at: null,
        created_at: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    const svc = new ColdEmailService({ db: { query }, llm: { complete: vi.fn() } });
    const p = await svc.addProspect(CAMPAIGN_ID, USER_ID, {
      name: "X",
      email: "x@test.com",
      company: "Co",
      role: "Dev",
    });
    expect(p.status).toBe("pending");
  });

  it("launchCampaign activa y programa send_at", async () => {
    const seq = JSON.parse(SEQ_JSON);
    const query = vi.fn().mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("UPDATE cold_email_campaigns")) return Promise.resolve([]);
      if (s.includes("UPDATE cold_email_prospects")) return Promise.resolve([]);
      if (s.includes("cold_email_campaigns") && s.includes("user_id = $2::uuid")) {
        return Promise.resolve([
          {
            id: CAMPAIGN_ID,
            user_id: USER_ID,
            target_company: "Acme",
            input: INPUT,
            sequence: seq,
            status: "draft",
            created_at: new Date("2026-01-01T00:00:00.000Z"),
            updated_at: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]);
      }
      if (s.includes("FROM cold_email_campaigns") && s.includes("WHERE id = $1::uuid")) {
        return Promise.resolve([
          {
            id: CAMPAIGN_ID,
            user_id: USER_ID,
            target_company: "Acme",
            input: INPUT,
            sequence: seq,
            status: "active",
            created_at: new Date("2026-01-01T00:00:00.000Z"),
            updated_at: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]);
      }
      return Promise.resolve([]);
    });
    const svc = new ColdEmailService({ db: { query }, llm: { complete: vi.fn() } });
    const c = await svc.launchCampaign(CAMPAIGN_ID, USER_ID);
    expect(c.status).toBe("active");
    expect(query.mock.calls.some((call) => String(call[0]).includes("UPDATE cold_email_prospects"))).toBe(true);
  });

  it("processScheduledEmails avanza pasos", async () => {
    const seq = JSON.parse(SEQ_JSON);
    const query = vi.fn().mockImplementation((sql: string) => {
      const s = String(sql);
      if (s.includes("FROM cold_email_prospects p") && s.includes("INNER JOIN")) {
        return Promise.resolve([
          {
            id: PROSPECT_ID,
            campaign_id: CAMPAIGN_ID,
            user_id: USER_ID,
            current_step: 0,
            sequence: seq,
          },
        ]);
      }
      if (s.includes("UPDATE cold_email_prospects")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const svc = new ColdEmailService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.processScheduledEmails();
    expect(out.processed).toBe(1);
  });

  it("detectReply marca replied", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: PROSPECT_ID,
        campaign_id: CAMPAIGN_ID,
        user_id: USER_ID,
        name: "X",
        email: "x@test.com",
        company: null,
        role: null,
        status: "replied",
        current_step: 1,
        send_at: null,
        sent_at: new Date("2026-01-03T00:00:00.000Z"),
        replied_at: new Date("2026-01-04T00:00:00.000Z"),
        created_at: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
    const svc = new ColdEmailService({ db: { query }, llm: { complete: vi.fn() } });
    const p = await svc.detectReply(PROSPECT_ID, USER_ID);
    expect(p?.status).toBe("replied");
  });

  it("getStats agrega métricas", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ n: "1" }]).mockResolvedValueOnce([
      { total: "4", replied: "1", steps: "7" },
    ]);
    const svc = new ColdEmailService({ db: { query }, llm: { complete: vi.fn() } });
    const st = await svc.getStats(CAMPAIGN_ID, USER_ID);
    expect(st.totalProspects).toBe(4);
    expect(st.replied).toBe(1);
    expect(st.emailsSent).toBe(7);
    expect(st.opens).toBeNull();
  });

  it("getCampaigns lista por fecha", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: CAMPAIGN_ID,
        user_id: USER_ID,
        target_company: "Acme",
        input: INPUT,
        sequence: JSON.parse(SEQ_JSON),
        status: "draft",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new ColdEmailService({ db: { query }, llm: { complete: vi.fn() } });
    const rows = await svc.getCampaigns(USER_ID);
    expect(rows).toHaveLength(1);
    expect(query.mock.calls[0][0]).toContain("ORDER BY created_at DESC");
  });

  it("getColdEmailService singleton", () => {
    resetColdEmailServiceForTests();
    expect(getColdEmailService()).toBe(getColdEmailService());
  });
});
