import { afterEach, describe, expect, it, vi } from "vitest";

import * as Auth from "@nelvyon/auth";
import * as Saas from "@nelvyon/saas";
import * as Onboarding from "../SaasOnboardingService";
import { OsAgentError } from "@nelvyon/os-agents";
import { GET as GET_DEALS, POST as POST_DEALS } from "../../../apps/web/src/app/api/saas/deals/route";
import { GET as GET_METRICS } from "../../../apps/web/src/app/api/saas/deals/metrics/route";
import { SaasDealsService } from "../SaasDealsService";

type DealRow = {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  title: string;
  value: number;
  currency: string;
  stage: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  probability: number;
  expected_close_date: string | null;
  source: string | null;
  owner_user_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

function makeDb() {
  const deals: DealRow[] = [];
  const contacts = new Map<string, string>();
  let tick = 0;

  async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    const p = params ?? [];

    if (s.includes("SELECT plan FROM saas_tenants")) {
      return [{ plan: "enterprise" }] as T[];
    }
    if (s.includes("COUNT(*)") && s.includes("FROM saas_deals")) {
      const tenantId = String(p[0]);
      return [{ n: deals.filter((d) => d.tenant_id === tenantId).length }] as T[];
    }

    if (s.startsWith("SELECT id FROM saas_contacts WHERE tenant_id")) {
      const key = `${p[0]}:${p[1]}`;
      return (contacts.has(key) ? [{ id: p[1] }] : []) as T[];
    }

    if (s.startsWith("INSERT INTO saas_deals")) {
      const row: DealRow = {
        id: `d-${deals.length + 1}`,
        tenant_id: String(p[0]),
        contact_id: (p[1] as string | null) ?? null,
        title: String(p[2]),
        value: Number(p[3] ?? 0),
        currency: String(p[4] ?? "EUR"),
        stage: String(p[5]) as DealRow["stage"],
        probability: Number(p[6] ?? 10),
        expected_close_date: (p[7] as string | null) ?? null,
        source: (p[8] as string | null) ?? null,
        owner_user_id: null,
        notes: (p[9] as string | null) ?? null,
        created_at: new Date(++tick),
        updated_at: new Date(tick),
      };
      deals.push(row);
      return [row as unknown as T];
    }

    if (s.includes("FROM saas_deals WHERE tenant_id = $1 AND id = $2")) {
      const row = deals.find((d) => d.tenant_id === String(p[0]) && d.id === String(p[1]));
      return (row ? [row] : []) as T[];
    }

    if (s.startsWith("SELECT id, tenant_id, contact_id, title, value, currency, stage")) {
      let out = deals.filter((d) => d.tenant_id === String(p[0]));
      if (s.includes("stage = $2")) out = out.filter((d) => d.stage === String(p[1]));
      if (s.includes("contact_id = $")) {
        const cid = String(p[s.includes("stage = $2") ? 2 : 1]);
        out = out.filter((d) => d.contact_id === cid);
      }
      return out.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime()) as unknown as T[];
    }

    if (s.startsWith("UPDATE saas_deals SET")) {
      const row = deals.find((d) => d.tenant_id === String(p[0]) && d.id === String(p[1]));
      if (!row) return [] as T[];
      if (p[6] !== null) row.stage = String(p[6]) as DealRow["stage"];
      if (p[7] !== null) row.probability = Number(p[7]);
      row.updated_at = new Date(++tick);
      return [row as unknown as T];
    }

    if (s.startsWith("DELETE FROM saas_deals")) {
      const idx = deals.findIndex((d) => d.tenant_id === String(p[0]) && d.id === String(p[1]));
      if (idx >= 0) deals.splice(idx, 1);
      return [] as T[];
    }

    if (s.includes("GROUP BY stage")) {
      const tenantId = String(p[0]);
      const grouped = new Map<string, { n: number; total: number }>();
      for (const d of deals.filter((x) => x.tenant_id === tenantId)) {
        const g = grouped.get(d.stage) ?? { n: 0, total: 0 };
        g.n += 1;
        g.total += d.value;
        grouped.set(d.stage, g);
      }
      return [...grouped.entries()].map(([stage, v]) => ({
        stage,
        n: String(v.n),
        total_value: String(v.total),
        won_from_stage: "0",
      })) as unknown as T[];
    }

    return [] as T[];
  }

  return {
    query,
    seedContact(tenantId: string, contactId: string) {
      contacts.set(`${tenantId}:${contactId}`, contactId);
    },
    deals,
  };
}

describe("SaasDealsService", () => {
  afterEach(() => {
    Saas.resetSaasDealsServiceForTests();
  });

  it("aisla deals por tenant", async () => {
    const db = makeDb();
    const svc = new SaasDealsService(db);
    await svc.createDeal("tenant-a", { title: "Deal A" });
    await svc.createDeal("tenant-b", { title: "Deal B" });
    const listA = await svc.listDeals("tenant-a");
    expect(listA).toHaveLength(1);
    expect(listA[0].title).toBe("Deal A");
  });

  it("changeStage a won pone probability 100", async () => {
    const db = makeDb();
    const svc = new SaasDealsService(db);
    const d = await svc.createDeal("t1", { title: "X", probability: 20 });
    const won = await svc.changeStage("t1", d.id, "won");
    expect(won.stage).toBe("won");
    expect(won.probability).toBe(100);
  });

  it("getMetrics calcula pipeline y forecast", async () => {
    const db = makeDb();
    const svc = new SaasDealsService(db);
    await svc.createDeal("t1", { title: "Open", value: 1000, probability: 50, stage: "proposal" });
    await svc.createDeal("t1", { title: "Won", value: 500, stage: "won" });
    const m = await svc.getMetrics("t1");
    expect(m.openCount).toBe(1);
    expect(m.wonCount).toBe(1);
    expect(m.pipelineValue).toBe(1000);
    expect(m.wonValue).toBe(500);
    expect(m.forecastValue).toBeGreaterThan(0);
    expect(m.forecastMethod).toBe("weighted_heuristic_v1");
  });
});

describe("API /api/saas/deals", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Saas.resetSaasDealsServiceForTests();
    Saas.resetSaasOnboardingServiceForTests();
  });

  it("GET → 401 sin auth", async () => {
    const res = await GET_DEALS(new Request("https://app.test/api/saas/deals"));
    expect(res.status).toBe(401);
  });

  it("POST → 201 crea deal", async () => {
    const db = makeDb();
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "a@test.com", role: "admin" });
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: async () => ({
        id: "tenant-1",
        userId: "u1",
        plan: "starter",
        companyName: "T",
        onboardingCompleted: true,
        createdAt: "",
        updatedAt: "",
      }),
    } as ReturnType<typeof Onboarding.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasDealsService").mockReturnValue(new SaasDealsService(db));

    const req = new Request("https://app.test/api/saas/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nueva oportunidad", value: 1200 }),
    });
    const res = await POST_DEALS(req);
    expect(res.status).toBe(201);
    const json = (await res.json()) as { deal: { title: string } };
    expect(json.deal.title).toBe("Nueva oportunidad");
  });

  it("GET metrics → 200", async () => {
    const db = makeDb();
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "a@test.com", role: "admin" });
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: async () => ({
        id: "tenant-1",
        userId: "u1",
        plan: "starter",
        companyName: "T",
        onboardingCompleted: true,
        createdAt: "",
        updatedAt: "",
      }),
    } as ReturnType<typeof Onboarding.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasDealsService").mockReturnValue(new SaasDealsService(db));

    const res = await GET_METRICS(new Request("https://app.test/api/saas/deals/metrics"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { metrics: { openCount: number } };
    expect(json.metrics.openCount).toBe(0);
  });
});
