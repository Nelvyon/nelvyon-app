import { describe, expect, it } from "vitest";

import { SaasCampaniasService } from "../SaasCampaniasService";

type ContactRow = { id: string; tenant_id: string; status: string; pipeline_stage: string; tags: string[] };
type DealRow = { id: string; tenant_id: string; contact_id: string; stage: string };

function makeDb() {
  const contacts: ContactRow[] = [
    { id: "c1", tenant_id: "t1", status: "lead", pipeline_stage: "new", tags: [] },
    { id: "c2", tenant_id: "t1", status: "lead", pipeline_stage: "won", tags: [] },
    { id: "c3", tenant_id: "t2", status: "lead", pipeline_stage: "new", tags: [] },
  ];
  const deals: DealRow[] = [
    { id: "d1", tenant_id: "t1", contact_id: "c1", stage: "proposal" },
    { id: "d2", tenant_id: "t1", contact_id: "c2", stage: "won" },
    { id: "d3", tenant_id: "t2", contact_id: "c3", stage: "proposal" },
  ];
  const campanias: Array<{ id: string; tenant_id: string; audience_filter: Record<string, unknown>; status: string }> = [];

  async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    const p = params ?? [];

    if (s.includes("SELECT DISTINCT c.id") && s.includes("INNER JOIN saas_deals")) {
      const tenantId = String(p[0]);
      const dealStage = s.includes("d.stage = $") ? String(p[1]) : null;
      const openOnly = s.includes("d.stage NOT IN ('won', 'lost')");
      const contactIds = new Set<string>();
      for (const d of deals.filter((x) => x.tenant_id === tenantId)) {
        if (dealStage && d.stage !== dealStage) continue;
        if (openOnly && (d.stage === "won" || d.stage === "lost")) continue;
        if (contacts.some((c) => c.id === d.contact_id && c.tenant_id === tenantId)) {
          contactIds.add(d.contact_id);
        }
      }
      return [...contactIds].map((id) => ({ id })) as T[];
    }

    if (s.startsWith("SELECT id FROM saas_contacts")) {
      const tenantId = String(p[0]);
      return contacts.filter((c) => c.tenant_id === tenantId).map((c) => ({ id: c.id })) as T[];
    }

    if (s.startsWith("INSERT INTO saas_campanias")) {
      campanias.push({
        id: `camp-${campanias.length + 1}`,
        tenant_id: String(p[0]),
        audience_filter: (p[9] as Record<string, unknown>) ?? {},
        status: "draft",
      });
      return [{
        id: campanias[campanias.length - 1]!.id,
        tenant_id: String(p[0]),
        name: String(p[1]),
        description: p[2],
        status: "draft",
        channel: p[4],
        subject: p[5],
        body: p[6],
        cta_text: p[7],
        cta_url: p[8],
        audience_filter: p[9],
        scheduled_at: null,
        started_at: null,
        completed_at: null,
        total_recipients: 0,
        sent_count: 0,
        opened_count: 0,
        clicked_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }] as T[];
    }

    if (s.includes("FROM saas_campanias") && s.includes("WHERE tenant_id = $1 AND id = $2")) {
      const row = campanias.find((c) => c.tenant_id === String(p[0]) && c.id === String(p[1]));
      if (!row) return [] as T[];
      return [{
        id: row.id,
        tenant_id: row.tenant_id,
        name: "C",
        description: null,
        status: row.status,
        channel: "email",
        subject: null,
        body: "b",
        cta_text: null,
        cta_url: null,
        audience_filter: row.audience_filter,
        scheduled_at: null,
        started_at: null,
        completed_at: null,
        total_recipients: 0,
        sent_count: 0,
        opened_count: 0,
        clicked_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }] as T[];
    }

    if (s.startsWith("UPDATE saas_campanias SET status = 'running'")) return [] as T[];
    if (s.startsWith("INSERT INTO saas_campania_recipients")) return [] as T[];
    if (s.startsWith("UPDATE saas_campania_recipients")) return [] as T[];
    if (s.startsWith("UPDATE saas_campanias SET status = 'completed'")) return [] as T[];
    if (s.includes("SELECT plan FROM saas_tenants")) return [{ plan: "enterprise" }] as T[];
    if (s.includes("COUNT(*)") && s.includes("FROM saas_campanias")) return [{ n: campanias.length }] as T[];

    return [] as T[];
  }

  return { query, contacts, deals, campanias };
}

describe("SaasCampaniasService deal audience", () => {
  it("launchCampania filtra contactos por deal_stage proposal", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", {
      name: "Prop",
      body: "Hi",
      channel: "email",
      audienceFilter: { deal_stage: "proposal" },
    });
    const result = await svc.launchCampania("t1", c.id);
    expect(result.totalSent).toBe(1);
  });

  it("deal_open_only excluye contactos solo con deals won/lost", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", {
      name: "Open",
      body: "Hi",
      channel: "email",
      audienceFilter: { deal_open_only: true },
    });
    const result = await svc.launchCampania("t1", c.id);
    expect(result.totalSent).toBe(1);
  });

  it("aisla tenant en audiencia por deal", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t2", {
      name: "T2",
      body: "Hi",
      channel: "email",
      audienceFilter: { deal_stage: "proposal" },
    });
    const result = await svc.launchCampania("t2", c.id);
    expect(result.totalSent).toBe(1);
  });
});
