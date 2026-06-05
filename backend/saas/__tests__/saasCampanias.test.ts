import { afterEach, describe, expect, it, vi } from "vitest";

import * as Auth from "@nelvyon/auth";
import * as Saas from "@nelvyon/saas";
import * as Onboarding from "../SaasOnboardingService";
import { OsAgentError } from "@nelvyon/os-agents";
import { GET as GET_CAMPANIAS, POST as POST_CAMPANIAS } from "../../../apps/web/src/app/api/saas/campanias/route";
import { POST as POST_LAUNCH } from "../../../apps/web/src/app/api/saas/campanias/[campaniaId]/launch/route";
import { GET as GET_STATS } from "../../../apps/web/src/app/api/saas/campanias/[campaniaId]/stats/route";
import { SaasCampaniasService } from "../SaasCampaniasService";

type CampaniaRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";
  channel: "email" | "sms" | "notification" | "multi";
  subject: string | null;
  body: string;
  cta_text: string | null;
  cta_url: string | null;
  audience_filter: Record<string, unknown>;
  scheduled_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: Date;
  updated_at: Date;
};

type RecipientRow = {
  id: string;
  campania_id: string;
  contact_id: string;
  tenant_id: string;
  status: "pending" | "sent" | "opened" | "clicked" | "bounced" | "unsubscribed";
  sent_at: Date | null;
  opened_at: Date | null;
  clicked_at: Date | null;
};

type ContactRow = {
  id: string;
  tenant_id: string;
  status: "lead" | "prospect" | "client" | "churned";
  pipeline_stage: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  tags: string[];
};

function makeDb() {
  const campanias: CampaniaRow[] = [];
  const recipients: RecipientRow[] = [];
  const contacts: ContactRow[] = [];
  let tick = 0;

  async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    const p = params ?? [];

    if (s.startsWith("INSERT INTO saas_campanias")) {
      const status = String(p[3]);
      const channel = String(p[4]);
      if (!["draft", "scheduled", "running", "paused", "completed", "cancelled"].includes(status) || !["email", "sms", "notification", "multi"].includes(channel)) {
        const e = new Error("check");
        (e as { code: string }).code = "23514";
        throw e;
      }
      const row: CampaniaRow = {
        id: `c-${campanias.length + 1}`,
        tenant_id: String(p[0]),
        name: String(p[1]),
        description: (p[2] as string | null) ?? null,
        status: status as CampaniaRow["status"],
        channel: channel as CampaniaRow["channel"],
        subject: (p[5] as string | null) ?? null,
        body: String(p[6]),
        cta_text: (p[7] as string | null) ?? null,
        cta_url: (p[8] as string | null) ?? null,
        audience_filter: (p[9] as Record<string, unknown>) ?? {},
        scheduled_at: null,
        started_at: null,
        completed_at: null,
        total_recipients: 0,
        sent_count: 0,
        opened_count: 0,
        clicked_count: 0,
        created_at: new Date(Date.now() + ++tick),
        updated_at: new Date(Date.now() + tick),
      };
      campanias.push(row);
      return [row as unknown as T];
    }
    if (s.includes("FROM saas_campanias") && s.includes("WHERE tenant_id = $1 ORDER BY created_at DESC")) {
      return campanias.filter((x) => x.tenant_id === String(p[0])).sort((a, b) => b.created_at.getTime() - a.created_at.getTime()) as unknown as T[];
    }
    if (s.includes("FROM saas_campanias") && s.includes("WHERE tenant_id = $1 AND id = $2") && s.includes("LIMIT 1")) {
      const row = campanias.find((x) => x.tenant_id === String(p[0]) && x.id === String(p[1]));
      return (row ? [row] : []) as T[];
    }
    if (s.startsWith("UPDATE saas_campanias SET name = COALESCE")) {
      const row = campanias.find((x) => x.tenant_id === String(p[0]) && x.id === String(p[1]));
      if (!row) return [] as T[];
      if (p[2] !== null) row.name = String(p[2]);
      if (p[3] !== null) row.description = String(p[3]);
      if (p[4] !== null) row.status = String(p[4]) as CampaniaRow["status"];
      if (p[5] !== null) row.channel = String(p[5]) as CampaniaRow["channel"];
      if (p[6] !== null) row.subject = String(p[6]);
      if (p[7] !== null) row.body = String(p[7]);
      if (p[8] !== null) row.cta_text = String(p[8]);
      if (p[9] !== null) row.cta_url = String(p[9]);
      if (p[10] !== null) row.audience_filter = p[10] as Record<string, unknown>;
      row.updated_at = new Date(Date.now() + ++tick);
      return [row as unknown as T];
    }
    if (s.startsWith("DELETE FROM saas_campanias")) {
      const idx = campanias.findIndex((x) => x.tenant_id === String(p[0]) && x.id === String(p[1]));
      if (idx >= 0) campanias.splice(idx, 1);
      return [] as T[];
    }
    if (s.startsWith("UPDATE saas_campanias SET status = 'scheduled'")) {
      const row = campanias.find((x) => x.tenant_id === String(p[0]) && x.id === String(p[1]));
      if (!row) return [] as T[];
      row.status = "scheduled";
      row.scheduled_at = new Date(String(p[2]));
      return [row as unknown as T];
    }
    if (s.startsWith("SELECT id FROM saas_contacts")) {
      const tenantId = String(p[0]);
      let out = contacts.filter((x) => x.tenant_id === tenantId);
      if (s.includes("status = $2")) out = out.filter((x) => x.status === String(p[1]));
      if (s.includes("pipeline_stage = $2") || s.includes("pipeline_stage = $3")) {
        const idx = s.includes("status = $2") ? 2 : 1;
        out = out.filter((x) => x.pipeline_stage === String(p[idx]));
      }
      if (s.includes("tags &&")) {
        const idx = s.includes("status = $2") || s.includes("pipeline_stage = $2") ? 2 : s.includes("pipeline_stage = $3") ? 3 : 1;
        const tags = (p[idx] as string[]) ?? [];
        out = out.filter((x) => x.tags.some((t) => tags.includes(t)));
      }
      return out.map((x) => ({ id: x.id })) as unknown as T[];
    }
    if (s.startsWith("UPDATE saas_campanias SET status = 'running'")) {
      const row = campanias.find((x) => x.tenant_id === String(p[0]) && x.id === String(p[1]));
      if (row) {
        row.status = "running";
        row.total_recipients = Number(p[2] ?? 0);
        row.started_at = new Date(Date.now() + ++tick);
      }
      return [] as T[];
    }
    if (s.startsWith("INSERT INTO saas_campania_recipients")) {
      recipients.push({
        id: `r-${recipients.length + 1}`,
        campania_id: String(p[0]),
        contact_id: String(p[1]),
        tenant_id: String(p[2]),
        status: "pending",
        sent_at: null,
        opened_at: null,
        clicked_at: null,
      });
      return [] as T[];
    }
    if (s.startsWith("UPDATE saas_campania_recipients")) {
      for (const r of recipients.filter((x) => x.tenant_id === String(p[0]) && x.campania_id === String(p[1]))) {
        r.status = "sent";
        r.sent_at = new Date(Date.now() + ++tick);
      }
      return [] as T[];
    }
    if (s.startsWith("UPDATE saas_campanias SET status = 'completed'")) {
      const row = campanias.find((x) => x.tenant_id === String(p[0]) && x.id === String(p[1]));
      if (row) {
        row.status = "completed";
        row.sent_count = Number(p[2] ?? 0);
        row.completed_at = new Date(Date.now() + ++tick);
      }
      return [] as T[];
    }
    if (s.startsWith("UPDATE saas_campanias SET status = 'paused'")) {
      const row = campanias.find((x) => x.tenant_id === String(p[0]) && x.id === String(p[1]));
      if (!row) return [] as T[];
      row.status = "paused";
      return [row as unknown as T];
    }
    if (s.startsWith("SELECT id, campania_id, contact_id, tenant_id, status, sent_at")) {
      return recipients.filter((x) => x.tenant_id === String(p[0]) && x.campania_id === String(p[1])) as unknown as T[];
    }
    return [] as T[];
  }

  return { query, campanias, recipients, contacts };
}

describe("SaasCampaniasService", () => {
  it("createCampania crea con status 'draft'", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    expect(c.status).toBe("draft");
  });

  it("createCampania falla con channel inválido", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    await expect(svc.createCampania("t1", { name: "A", body: "B", channel: "x" as never })).rejects.toThrow();
  });

  it("createCampania falla con status inválido", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    await expect(svc.createCampania("t1", { name: "A", body: "B", channel: "email", status: "x" as never })).rejects.toThrow();
  });

  it("getCampanias retorna array vacío si no hay", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    await expect(svc.getCampanias("t1")).resolves.toEqual([]);
  });

  it("getCampania retorna null si no existe", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    await expect(svc.getCampania("t1", "x")).resolves.toBeNull();
  });

  it("getCampania no permite cross-tenant", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    await expect(svc.getCampania("t2", c.id)).resolves.toBeNull();
  });

  it("updateCampania actualiza campos correctamente", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    const u = await svc.updateCampania("t1", c.id, { name: "A2", status: "scheduled" });
    expect(u.name).toBe("A2");
    expect(u.status).toBe("scheduled");
  });

  it("deleteCampania elimina correctamente", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    await svc.deleteCampania("t1", c.id);
    await expect(svc.getCampania("t1", c.id)).resolves.toBeNull();
  });

  it("scheduleCampania actualiza scheduled_at y status a 'scheduled'", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    const s = await svc.scheduleCampania("t1", c.id, "2030-01-01T10:00:00.000Z");
    expect(s.status).toBe("scheduled");
    expect(s.scheduledAt).toBeTruthy();
  });

  it("launchCampania cambia status a 'completed'", async () => {
    const db = makeDb();
    db.contacts.push({ id: "ct-1", tenant_id: "t1", status: "lead", pipeline_stage: "new", tags: [] });
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    const out = await svc.launchCampania("t1", c.id);
    expect(out.status).toBe("completed");
  });

  it("launchCampania con audience_filter {} incluye todos los contactos", async () => {
    const db = makeDb();
    db.contacts.push({ id: "ct-1", tenant_id: "t1", status: "lead", pipeline_stage: "new", tags: [] }, { id: "ct-2", tenant_id: "t1", status: "client", pipeline_stage: "won", tags: [] });
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email", audienceFilter: {} });
    const out = await svc.launchCampania("t1", c.id);
    expect(out.totalSent).toBe(2);
  });

  it("launchCampania con audience_filter status filtra correctamente", async () => {
    const db = makeDb();
    db.contacts.push({ id: "ct-1", tenant_id: "t1", status: "lead", pipeline_stage: "new", tags: [] }, { id: "ct-2", tenant_id: "t1", status: "client", pipeline_stage: "won", tags: [] });
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email", audienceFilter: { status: "lead" } });
    const out = await svc.launchCampania("t1", c.id);
    expect(out.totalSent).toBe(1);
  });

  it("launchCampania actualiza total_recipients y sent_count", async () => {
    const db = makeDb();
    db.contacts.push({ id: "ct-1", tenant_id: "t1", status: "lead", pipeline_stage: "new", tags: [] });
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    await svc.launchCampania("t1", c.id);
    const latest = await svc.getCampania("t1", c.id);
    expect(latest?.totalRecipients).toBe(1);
    expect(latest?.sentCount).toBe(1);
  });

  it("launchCampania inserta recipients en saas_campania_recipients", async () => {
    const db = makeDb();
    db.contacts.push({ id: "ct-1", tenant_id: "t1", status: "lead", pipeline_stage: "new", tags: [] });
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    await svc.launchCampania("t1", c.id);
    expect(db.recipients.length).toBe(1);
  });

  it("pauseCampania cambia status a 'paused'", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    const p = await svc.pauseCampania("t1", c.id);
    expect(p.status).toBe("paused");
  });

  it("getCampaniaStats retorna open_rate y click_rate calculados", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    await svc.updateCampania("t1", c.id, { status: "completed" });
    db.campanias[0]!.sent_count = 10;
    db.campanias[0]!.opened_count = 5;
    db.campanias[0]!.clicked_count = 2;
    const s = await svc.getCampaniaStats("t1", c.id);
    expect(s.open_rate).toBe(50);
    expect(s.click_rate).toBe(20);
  });

  it("getRecipients retorna recipients de la campaña", async () => {
    const db = makeDb();
    db.contacts.push({ id: "ct-1", tenant_id: "t1", status: "lead", pipeline_stage: "new", tags: [] });
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    await svc.launchCampania("t1", c.id);
    const r = await svc.getRecipients("t1", c.id);
    expect(r).toHaveLength(1);
  });

  it("No se puede lanzar campaña ya completada", async () => {
    const db = makeDb();
    db.contacts.push({ id: "ct-1", tenant_id: "t1", status: "lead", pipeline_stage: "new", tags: [] });
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "A", body: "B", channel: "email" });
    await svc.launchCampania("t1", c.id);
    await expect(svc.launchCampania("t1", c.id)).rejects.toThrow();
  });
});

describe("API SaaS campanias", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Saas.resetSaasCampaniasServiceForTests();
  });

  it("API GET /api/saas/campanias → 401 sin auth", async () => {
    vi.spyOn(Auth, "authenticate").mockRejectedValue(new OsAgentError("Unauthorized"));
    const res = await GET_CAMPANIAS(new Request("https://app.test/api/saas/campanias"));
    expect(res.status).toBe(401);
  });

  it("API POST /api/saas/campanias → 201 con datos válidos", async () => {
    const db = makeDb();
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "auth-tenant-1", plan: "free" });
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "t1" }),
    } as unknown as ReturnType<typeof Onboarding.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasCampaniasService").mockReturnValue(new SaasCampaniasService(db));
    const req = new Request("https://app.test/api/saas/campanias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "C", body: "B", channel: "email" }),
    });
    const res = await POST_CAMPANIAS(req);
    expect(res.status).toBe(201);
  });

  it("API POST /api/saas/campanias/[id]/launch → 200 con CampaniaLaunchResult", async () => {
    const db = makeDb();
    db.contacts.push({ id: "ct-1", tenant_id: "t1", status: "lead", pipeline_stage: "new", tags: [] });
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "C", body: "B", channel: "email" });
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "auth-tenant-1", plan: "free" });
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "t1" }),
    } as unknown as ReturnType<typeof Onboarding.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasCampaniasService").mockReturnValue(svc);
    const req = new Request("https://app.test/api/saas/campanias/x/launch", { method: "POST" });
    const res = await POST_LAUNCH(req, { params: Promise.resolve({ campaniaId: c.id }) });
    expect(res.status).toBe(200);
  });

  it("API GET /api/saas/campanias/[id]/stats → 200 con CampaniaStats", async () => {
    const db = makeDb();
    const svc = new SaasCampaniasService(db);
    const c = await svc.createCampania("t1", { name: "C", body: "B", channel: "email" });
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "auth-tenant-1", plan: "free" });
    vi.spyOn(Onboarding, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "t1" }),
    } as unknown as ReturnType<typeof Onboarding.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasCampaniasService").mockReturnValue(svc);
    const req = new Request("https://app.test/api/saas/campanias/x/stats");
    const res = await GET_STATS(req, { params: Promise.resolve({ campaniaId: c.id }) });
    expect(res.status).toBe(200);
  });
});
