import { afterEach, describe, expect, it, vi } from "vitest";

import * as Auth from "@nelvyon/auth";
import * as Saas from "@nelvyon/saas";
import { OsAgentError } from "@nelvyon/os-agents";
import { GET as GET_CONTACTS, POST as POST_CONTACTS } from "../../../apps/web/src/app/api/saas/crm/contacts/route";
import { GET as GET_PIPELINE } from "../../../apps/web/src/app/api/saas/crm/pipeline/route";
import { SaasCrmService } from "../SaasCrmService";

type ContactRow = {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  status: "lead" | "prospect" | "client" | "churned";
  pipeline_stage: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  value: number;
  notes: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
};

type ActivityRow = {
  id: string;
  contact_id: string;
  tenant_id: string;
  activity_type: "note" | "call" | "email" | "meeting" | "task";
  description: string;
  scheduled_at: Date | null;
  completed: boolean;
  created_at: Date;
};

function makeDb() {
  const contacts: ContactRow[] = [];
  const activities: ActivityRow[] = [];
  let nowTick = 0;

  async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    const p = params ?? [];
    if (s.startsWith("INSERT INTO saas_contacts")) {
      const status = String(p[6]);
      const stage = String(p[7]);
      if (!["lead", "prospect", "client", "churned"].includes(status) || !["new", "contacted", "qualified", "proposal", "won", "lost"].includes(stage)) {
        const e = new Error("check");
        (e as { code: string }).code = "23514";
        throw e;
      }
      const row: ContactRow = {
        id: `c-${contacts.length + 1}`,
        tenant_id: String(p[0]),
        name: String(p[1]),
        email: (p[2] as string | null) ?? null,
        phone: (p[3] as string | null) ?? null,
        company: (p[4] as string | null) ?? null,
        position: (p[5] as string | null) ?? null,
        status: status as ContactRow["status"],
        pipeline_stage: stage as ContactRow["pipeline_stage"],
        value: Number(p[8] ?? 0),
        notes: (p[9] as string | null) ?? null,
        tags: (p[10] as string[]) ?? [],
        created_at: new Date(Date.now() + ++nowTick),
        updated_at: new Date(Date.now() + nowTick),
      };
      contacts.push(row);
      return [row as unknown as T];
    }
    if (s.includes("FROM saas_contacts WHERE tenant_id = $1 AND id = $2 LIMIT 1")) {
      const row = contacts.find((c) => c.tenant_id === String(p[0]) && c.id === String(p[1]));
      return (row ? [row] : []) as T[];
    }
    if (s.startsWith("SELECT id, tenant_id, name, email, phone, company, position, status, pipeline_stage")) {
      const tenantId = String(p[0]);
      let out = contacts.filter((c) => c.tenant_id === tenantId);
      if (s.includes("status = $2")) out = out.filter((c) => c.status === String(p[1]));
      if (s.includes("pipeline_stage = $2") || s.includes("pipeline_stage = $3")) {
        const stageVal = String(p[s.includes("status = $2") ? 2 : 1]);
        out = out.filter((c) => c.pipeline_stage === stageVal);
      }
      if (s.includes("ILIKE")) {
        const term = String(p[p.length - 1]).replace(/%/g, "").toLowerCase();
        out = out.filter((c) => c.name.toLowerCase().includes(term) || (c.email ?? "").toLowerCase().includes(term));
      }
      return out.sort((a, b) => b.created_at.getTime() - a.created_at.getTime()) as unknown as T[];
    }
    if (s.startsWith("UPDATE saas_contacts SET")) {
      const row = contacts.find((c) => c.tenant_id === String(p[0]) && c.id === String(p[1]));
      if (!row) return [] as T[];
      if (p[2] !== null) row.name = String(p[2]);
      if (p[8] !== null) row.pipeline_stage = String(p[8]) as ContactRow["pipeline_stage"];
      if (p[7] !== null) row.status = String(p[7]) as ContactRow["status"];
      row.updated_at = new Date(Date.now() + ++nowTick);
      return [row as unknown as T];
    }
    if (s.startsWith("DELETE FROM saas_contacts")) {
      const idx = contacts.findIndex((c) => c.tenant_id === String(p[0]) && c.id === String(p[1]));
      if (idx >= 0) contacts.splice(idx, 1);
      return [] as T[];
    }
    if (s.startsWith("SELECT pipeline_stage")) {
      const tenantId = String(p[0]);
      const grouped = new Map<string, { n: number; total: number }>();
      for (const c of contacts.filter((x) => x.tenant_id === tenantId)) {
        const g = grouped.get(c.pipeline_stage) ?? { n: 0, total: 0 };
        g.n += 1;
        g.total += c.value;
        grouped.set(c.pipeline_stage, g);
      }
      return [...grouped.entries()].map(([pipeline_stage, v]) => ({ pipeline_stage, n: String(v.n), total_value: String(v.total) })) as unknown as T[];
    }
    if (s.startsWith("INSERT INTO saas_contact_activities")) {
      const type = String(p[2]);
      if (!["note", "call", "email", "meeting", "task"].includes(type)) {
        const e = new Error("invalid type");
        (e as { code: string }).code = "23514";
        throw e;
      }
      const row: ActivityRow = {
        id: `a-${activities.length + 1}`,
        contact_id: String(p[0]),
        tenant_id: String(p[1]),
        activity_type: type as ActivityRow["activity_type"],
        description: String(p[3]),
        scheduled_at: p[4] ? new Date(String(p[4])) : null,
        completed: p[5] === true,
        created_at: new Date(Date.now() + ++nowTick),
      };
      activities.push(row);
      return [row as unknown as T];
    }
    if (s.startsWith("SELECT id, contact_id, tenant_id, activity_type")) {
      const out = activities.filter((a) => a.contact_id === String(p[0]) && a.tenant_id === String(p[1]));
      return out.sort((a, b) => b.created_at.getTime() - a.created_at.getTime()) as unknown as T[];
    }
    return [] as T[];
  }

  return { query, contacts, activities };
}

describe("SaasCrmService", () => {
  it("createContact crea registro correctamente", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    const c = await svc.createContact("t1", { name: "Ana" });
    expect(c.name).toBe("Ana");
  });

  it("createContact falla con status inválido", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    await expect(svc.createContact("t1", { name: "Ana", status: "bad" as never })).rejects.toThrow();
  });

  it("createContact falla con pipeline_stage inválido", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    await expect(svc.createContact("t1", { name: "Ana", pipeline_stage: "bad" as never })).rejects.toThrow();
  });

  it("getContacts retorna array vacío si no hay contactos", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    await expect(svc.getContacts("t1")).resolves.toEqual([]);
  });

  it("getContacts filtra por status correctamente", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    await svc.createContact("t1", { name: "A", status: "lead" });
    await svc.createContact("t1", { name: "B", status: "client" });
    const out = await svc.getContacts("t1", { status: "client" });
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe("B");
  });

  it("getContacts filtra por pipeline_stage correctamente", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    await svc.createContact("t1", { name: "A", pipeline_stage: "new" });
    await svc.createContact("t1", { name: "B", pipeline_stage: "proposal" });
    const out = await svc.getContacts("t1", { pipeline_stage: "proposal" });
    expect(out[0]?.name).toBe("B");
  });

  it("getContacts busca por search (name o email)", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    await svc.createContact("t1", { name: "Carla", email: "x@test.com" });
    const byName = await svc.getContacts("t1", { search: "car" });
    const byEmail = await svc.getContacts("t1", { search: "test.com" });
    expect(byName).toHaveLength(1);
    expect(byEmail).toHaveLength(1);
  });

  it("getContact retorna null si no existe", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    await expect(svc.getContact("t1", "missing")).resolves.toBeNull();
  });

  it("getContact retorna contacto si existe y es del tenant", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    const c = await svc.createContact("t1", { name: "Ana" });
    const out = await svc.getContact("t1", c.id);
    expect(out?.name).toBe("Ana");
  });

  it("updateContact actualiza campos correctamente", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    const c = await svc.createContact("t1", { name: "Ana" });
    const up = await svc.updateContact("t1", c.id, { name: "Ana 2", pipeline_stage: "proposal" });
    expect(up.name).toBe("Ana 2");
    expect(up.pipelineStage).toBe("proposal");
  });

  it("updateContact no permite acceso cross-tenant (404 sin filtrar por id)", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    const c = await svc.createContact("t1", { name: "Ana" });
    await expect(svc.updateContact("t2", c.id, { name: "X" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deleteContact elimina correctamente", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    const c = await svc.createContact("t1", { name: "Ana" });
    await svc.deleteContact("t1", c.id);
    await expect(svc.getContact("t1", c.id)).resolves.toBeNull();
  });

  it("getPipelineSummary retorna todas las stages", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    const out = await svc.getPipelineSummary("t1");
    expect(out).toHaveLength(6);
  });

  it("getPipelineSummary calcula totalValue correctamente", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    await svc.createContact("t1", { name: "A", pipeline_stage: "won", value: 100 });
    await svc.createContact("t1", { name: "B", pipeline_stage: "won", value: 20 });
    const out = await svc.getPipelineSummary("t1");
    const won = out.find((x) => x.stage === "won");
    expect(won?.totalValue).toBe(120);
  });

  it("addActivity crea actividad con tipo válido", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    const c = await svc.createContact("t1", { name: "A" });
    const a = await svc.addActivity(c.id, "t1", { activityType: "note", description: "ok" });
    expect(a.activityType).toBe("note");
  });

  it("addActivity falla con activity_type inválido", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    const c = await svc.createContact("t1", { name: "A" });
    await expect(svc.addActivity(c.id, "t1", { activityType: "bad" as never, description: "x" })).rejects.toThrow();
  });

  it("getActivities retorna actividades del contacto", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    const c = await svc.createContact("t1", { name: "A" });
    await svc.addActivity(c.id, "t1", { activityType: "note", description: "1" });
    const out = await svc.getActivities(c.id, "t1");
    expect(out).toHaveLength(1);
  });
});

describe("API CRM", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Saas.resetSaasCrmServiceForTests();
  });

  it("API GET /api/saas/crm/contacts → 401 sin auth", async () => {
    vi.spyOn(Auth, "authenticate").mockRejectedValue(new OsAgentError("Unauthorized"));
    const res = await GET_CONTACTS(new Request("https://app.test/api/saas/crm/contacts"));
    expect(res.status).toBe(401);
  });

  it("API POST /api/saas/crm/contacts → 201 con datos válidos", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "x", plan: "free" });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "t1" }),
    } as unknown as ReturnType<typeof Saas.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasCrmService").mockReturnValue(svc);
    const req = new Request("https://app.test/api/saas/crm/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ana" }),
    });
    const res = await POST_CONTACTS(req);
    expect(res.status).toBe(201);
  });

  it("API GET /api/saas/crm/pipeline → 200 con PipelineSummary", async () => {
    const db = makeDb();
    const svc = new SaasCrmService(db);
    vi.spyOn(Auth, "authenticate").mockResolvedValue({ userId: "u1", email: "e@test.com", tenantId: "x", plan: "free" });
    vi.spyOn(Saas, "getSaasOnboardingService").mockReturnValue({
      getTenant: vi.fn().mockResolvedValue({ id: "t1" }),
    } as unknown as ReturnType<typeof Saas.getSaasOnboardingService>);
    vi.spyOn(Saas, "getSaasCrmService").mockReturnValue(svc);
    const res = await GET_PIPELINE(new Request("https://app.test/api/saas/crm/pipeline"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { pipeline: unknown[] };
    expect(Array.isArray(body.pipeline)).toBe(true);
  });
});
