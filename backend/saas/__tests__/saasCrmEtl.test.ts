import { describe, expect, it } from "vitest";

import { buildDedupeKey, etlLegacyIdTag, mapLegacyStatusToSaas } from "../saasCrmDedupe";
import { SaasCrmEtlService } from "../SaasCrmEtlService";

type ContactRow = {
  id: number;
  workspace_id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  company_name: string | null;
  status: string | null;
  notes: string | null;
  tags: string | null;
};

type CrmRow = {
  id: string;
  workspace_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  tags: unknown;
  metadata: unknown;
};

function makeEtlDb() {
  const tenants = [{ id: "tenant-1", workspace_id: 10 }];
  const contacts: ContactRow[] = [
    {
      id: 1,
      workspace_id: 10,
      first_name: "Ana",
      last_name: "García",
      email: "ana@test.com",
      phone: null,
      company_name: "Acme",
      status: "lead",
      notes: null,
      tags: null,
    },
  ];
  const crmContacts: CrmRow[] = [];
  const saasContacts: Array<{
    id: string;
    tenant_id: string;
    email: string | null;
    phone: string | null;
    name: string;
    tags: string[];
  }> = [];

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    if (s.includes("FROM saas_tenants WHERE workspace_id IS NOT NULL")) {
      return tenants as T[];
    }
    if (s.startsWith("SELECT id, tenant_id, email, phone, name, tags FROM saas_contacts")) {
      return saasContacts as T[];
    }
    if (s.includes("FROM saas_contacts WHERE EXISTS")) {
      return saasContacts.filter((c) => c.tags.some((t) => t.startsWith("etl:legacy_id:"))) as T[];
    }
    if (s.includes("to_regclass('public.contacts')")) {
      return [{ reg: "contacts" }] as T[];
    }
    if (s.includes("FROM contacts WHERE workspace_id")) {
      return contacts as T[];
    }
    if (s.includes("information_schema.columns") && s.includes("crm_contacts")) {
      return [
        { column_name: "workspace_id" },
        { column_name: "id" },
        { column_name: "name" },
        { column_name: "email" },
      ] as T[];
    }
    if (s.includes("FROM crm_contacts WHERE workspace_id")) {
      return crmContacts as T[];
    }
    if (s.startsWith("INSERT INTO saas_contacts")) {
      saasContacts.push({
        id: `saas-${saasContacts.length + 1}`,
        tenant_id: String(params[0]),
        name: String(params[1]),
        email: params[2] as string | null,
        phone: params[3] as string | null,
        tags: params[8] as string[],
      });
      return [] as T[];
    }
    return [] as T[];
  }

  return { query, saasContacts, contacts, crmContacts };
}

describe("saasCrmDedupe", () => {
  it("dedupe por email en mismo tenant", () => {
    const k1 = buildDedupeKey("t1", "ana@test.com", null, "Ana");
    const k2 = buildDedupeKey("t1", "ANA@test.com ", null, "Ana García");
    expect(k1).toBe(k2);
  });

  it("dedupe por teléfono+nombre sin email", () => {
    const k = buildDedupeKey("t1", null, "+34 600 111 222", "Bob");
    expect(k).toContain("pn:t1:");
  });

  it("mapea status legacy", () => {
    expect(mapLegacyStatusToSaas("active")).toBe("prospect");
  });
});

describe("SaasCrmEtlService", () => {
  it("dry-run cuenta candidatos y nuevos sin insertar", async () => {
    const db = makeEtlDb();
    const svc = new SaasCrmEtlService(db);
    const report = await svc.run("dry-run");
    expect(report.mode).toBe("dry-run");
    expect(report.candidatesTotal).toBe(1);
    expect(report.newContacts).toBe(1);
    expect(report.bySource.contacts).toBe(1);
    expect(report.appliedInserts).toBe(0);
    expect(db.saasContacts).toHaveLength(0);
  });

  it("apply inserta en saas_contacts con tags etl", async () => {
    const db = makeEtlDb();
    const svc = new SaasCrmEtlService(db);
    const report = await svc.run("apply");
    expect(report.appliedInserts).toBe(1);
    expect(db.saasContacts[0]?.tags).toContain(etlLegacyIdTag("contacts", "1"));
  });

  it("detecta duplicado si ya existe mismo dedupe en saas", async () => {
    const db = makeEtlDb();
    db.saasContacts.push({
      id: "existing",
      tenant_id: "tenant-1",
      email: "ana@test.com",
      phone: null,
      name: "Ana García",
      tags: [],
    });
    const svc = new SaasCrmEtlService(db);
    const report = await svc.run("dry-run");
    expect(report.duplicates).toBe(1);
    expect(report.newContacts).toBe(0);
  });
});
