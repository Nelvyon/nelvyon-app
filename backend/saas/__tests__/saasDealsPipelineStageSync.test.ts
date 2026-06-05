import { afterEach, describe, expect, it } from "vitest";

import { SaasDealsService } from "../SaasDealsService";

type DealStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

type DealRow = {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expected_close_date: string | null;
  source: string | null;
  owner_user_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type ContactRow = {
  id: string;
  tenant_id: string;
  pipeline_stage: DealStage;
};

function makeSyncDb() {
  const deals: DealRow[] = [];
  const contacts = new Map<string, ContactRow>();
  let tick = 0;

  function contactKey(tenantId: string, contactId: string) {
    return `${tenantId}:${contactId}`;
  }

  async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    const p = params ?? [];

    if (s.startsWith("SELECT id FROM saas_contacts WHERE tenant_id")) {
      const key = contactKey(String(p[0]), String(p[1]));
      return (contacts.has(key) ? [{ id: p[1] }] : []) as T[];
    }

    if (s.startsWith("UPDATE saas_contacts SET pipeline_stage")) {
      const key = contactKey(String(p[0]), String(p[1]));
      const row = contacts.get(key);
      if (row) row.pipeline_stage = String(p[2]) as DealStage;
      return [] as T[];
    }

    if (s.startsWith("INSERT INTO saas_deals")) {
      const row: DealRow = {
        id: `d-${deals.length + 1}`,
        tenant_id: String(p[0]),
        contact_id: (p[1] as string | null) ?? null,
        title: String(p[2]),
        value: Number(p[3] ?? 0),
        currency: String(p[4] ?? "EUR"),
        stage: String(p[5]) as DealStage,
        probability: Number(p[6] ?? 10),
        expected_close_date: (p[7] as string | null) ?? null,
        source: (p[8] as string | null) ?? null,
        owner_user_id: (p[9] as string | null) ?? null,
        notes: (p[10] as string | null) ?? null,
        created_at: new Date(++tick),
        updated_at: new Date(tick),
      };
      deals.push(row);
      return [row as unknown as T];
    }

    if (s.startsWith("SELECT id, tenant_id, contact_id, title, value, currency, stage")) {
      if (s.includes("AND id = $2") && !s.includes("contact_id = $")) {
        const row = deals.find((d) => d.tenant_id === String(p[0]) && d.id === String(p[1]));
        return (row ? [row] : []) as T[];
      }
      let out = deals.filter((d) => d.tenant_id === String(p[0]));
      let idx = 1;
      if (s.includes("stage = $")) {
        idx += 1;
        const stageIdx = s.indexOf("stage = $2") >= 0 ? 1 : idx;
        if (s.includes("stage = $2")) out = out.filter((d) => d.stage === String(p[1]));
        if (s.includes("contact_id = $")) {
          const contactParam = s.includes("stage = $2") ? 2 : 1;
          out = out.filter((d) => d.contact_id === String(p[contactParam]));
        }
      } else if (s.includes("contact_id = $")) {
        out = out.filter((d) => d.contact_id === String(p[1]));
      }
      return out.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime()) as unknown as T[];
    }

    if (s.startsWith("UPDATE saas_deals SET")) {
      const row = deals.find((d) => d.tenant_id === String(p[0]) && d.id === String(p[1]));
      if (!row) return [] as T[];
      if (p[2] !== null) row.contact_id = p[2] as string | null;
      if (p[3] !== null) row.title = String(p[3]);
      if (p[4] !== null) row.value = Number(p[4]);
      if (p[6] !== null) row.stage = String(p[6]) as DealStage;
      if (p[7] !== null) row.probability = Number(p[7]);
      row.updated_at = new Date(++tick);
      return [row as unknown as T];
    }

    if (s.startsWith("DELETE FROM saas_deals")) {
      const idx = deals.findIndex((d) => d.tenant_id === String(p[0]) && d.id === String(p[1]));
      if (idx >= 0) deals.splice(idx, 1);
      return [] as T[];
    }

    return [] as T[];
  }

  return {
    query,
    seedContact(tenantId: string, contactId: string, stage: DealStage = "new") {
      contacts.set(contactKey(tenantId, contactId), {
        id: contactId,
        tenant_id: tenantId,
        pipeline_stage: stage,
      });
    },
    getContactPipelineStage(tenantId: string, contactId: string) {
      return contacts.get(contactKey(tenantId, contactId))?.pipeline_stage;
    },
    deals,
  };
}

describe("SaasDealsService pipeline_stage sync", () => {
  afterEach(() => {
    // no global cache reset needed — fresh db per test
  });

  it("createDeal con contact_id actualiza pipeline_stage del contacto", async () => {
    const db = makeSyncDb();
    db.seedContact("t1", "c1", "new");
    const svc = new SaasDealsService(db);

    await svc.createDeal("t1", { title: "Big", contact_id: "c1", stage: "proposal", value: 9000 });

    expect(db.getContactPipelineStage("t1", "c1")).toBe("proposal");
  });

  it("changeStage actualiza pipeline_stage del contacto vinculado", async () => {
    const db = makeSyncDb();
    db.seedContact("t1", "c1", "new");
    const svc = new SaasDealsService(db);
    const d = await svc.createDeal("t1", { title: "Deal", contact_id: "c1", stage: "new" });

    await svc.changeStage("t1", d.id, "qualified");

    expect(db.getContactPipelineStage("t1", "c1")).toBe("qualified");
  });

  it("varios deals abiertos eligen etapa del deal con mayor value", async () => {
    const db = makeSyncDb();
    db.seedContact("t1", "c1", "new");
    const svc = new SaasDealsService(db);

    await svc.createDeal("t1", { title: "Small", contact_id: "c1", stage: "contacted", value: 500 });
    await svc.createDeal("t1", { title: "Big", contact_id: "c1", stage: "proposal", value: 8000 });

    expect(db.getContactPipelineStage("t1", "c1")).toBe("proposal");
  });

  it("editar contact_id recalcula contacto anterior y nuevo", async () => {
    const db = makeSyncDb();
    db.seedContact("t1", "c1", "new");
    db.seedContact("t1", "c2", "new");
    const svc = new SaasDealsService(db);
    const d = await svc.createDeal("t1", { title: "Move", contact_id: "c1", stage: "qualified", value: 1000 });

    await svc.updateDeal("t1", d.id, { contact_id: "c2" });

    expect(db.getContactPipelineStage("t1", "c1")).toBe("new");
    expect(db.getContactPipelineStage("t1", "c2")).toBe("qualified");
  });

  it("editar stage recalcula pipeline_stage del contacto", async () => {
    const db = makeSyncDb();
    db.seedContact("t1", "c1", "new");
    const svc = new SaasDealsService(db);
    const d = await svc.createDeal("t1", { title: "X", contact_id: "c1", stage: "new" });

    await svc.updateDeal("t1", d.id, { stage: "won" });

    expect(db.getContactPipelineStage("t1", "c1")).toBe("won");
  });

  it("no actualiza contactos de otro tenant", async () => {
    const db = makeSyncDb();
    db.seedContact("tenant-a", "c1", "new");
    db.seedContact("tenant-b", "c2", "new");
    const svc = new SaasDealsService(db);

    await svc.createDeal("tenant-a", { title: "Only A", contact_id: "c1", stage: "proposal" });

    expect(db.getContactPipelineStage("tenant-a", "c1")).toBe("proposal");
    expect(db.getContactPipelineStage("tenant-b", "c2")).toBe("new");
  });

  it("deleteDeal recalcula pipeline_stage del contacto", async () => {
    const db = makeSyncDb();
    db.seedContact("t1", "c1", "new");
    const svc = new SaasDealsService(db);
    const d1 = await svc.createDeal("t1", { title: "Keep", contact_id: "c1", stage: "proposal", value: 5000 });
    const d2 = await svc.createDeal("t1", { title: "Remove", contact_id: "c1", stage: "new", value: 100 });

    await svc.deleteDeal("t1", d2.id);

    expect(db.getContactPipelineStage("t1", "c1")).toBe("proposal");
    await svc.deleteDeal("t1", d1.id);
    expect(db.getContactPipelineStage("t1", "c1")).toBe("new");
  });
});
