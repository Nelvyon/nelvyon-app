import { describe, expect, it } from "vitest";

import { OsClientsBackfillService } from "../OsClientsBackfillService";
import {
  buildClientDedupeKey,
  LEGACY_SOURCE,
  mapLegacyStatus,
  normalizeEmail,
} from "../osClientsDedupe";

type LegacyRow = {
  id: number;
  user_id: string;
  workspace_id: number | null;
  business_name: string;
  sector: string | null;
  country: string | null;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string | null;
  notes: string | null;
  objectives: string | null;
};

type OsRow = {
  id: string;
  legacy_nelvyon_client_id: number | null;
  workspace_id: number;
  contact_email: string | null;
  business_name: string;
};

function makeBackfillDb(opts?: {
  legacy?: LegacyRow[];
  os?: OsRow[];
}) {
  const legacy: LegacyRow[] = opts?.legacy ?? [
    {
      id: 1,
      user_id: "user-1",
      workspace_id: 10,
      business_name: "Acme Corp",
      sector: "tech",
      country: "ES",
      city: "Madrid",
      contact_email: "hello@acme.com",
      contact_phone: "+34600111222",
      status: "active",
      notes: "VIP",
      objectives: "Grow MRR",
    },
  ];
  const osClients: OsRow[] = opts?.os ?? [];
  const inserts: unknown[][] = [];

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();

    if (s.includes("to_regclass($1)") || s.includes("to_regclass('public.")) {
      const table = String(params[0] ?? "").replace("public.", "");
      if (table === "nelvyon_clients" || table === "os_clients") {
        return [{ reg: table }] as T[];
      }
      return [{ reg: null }] as T[];
    }

    if (s.includes("information_schema.columns") && s.includes("nelvyon_clients")) {
      return [
        { column_name: "contact_email" },
        { column_name: "contact_phone" },
        { column_name: "status" },
        { column_name: "notes" },
        { column_name: "objectives" },
      ] as T[];
    }

    if (s.startsWith("SELECT id, user_id, workspace_id") && s.includes("FROM nelvyon_clients")) {
      return legacy as T[];
    }

    if (s.includes("legacy_nelvyon_client_id FROM os_clients")) {
      return osClients
        .filter((r) => r.legacy_nelvyon_client_id != null)
        .map((r) => ({ legacy_nelvyon_client_id: r.legacy_nelvyon_client_id! })) as T[];
    }

    if (
      s.includes("SELECT id, legacy_nelvyon_client_id, workspace_id, contact_email, business_name") &&
      s.includes("FROM os_clients")
    ) {
      return osClients as T[];
    }

    if (s.startsWith("INSERT INTO os_clients")) {
      inserts.push(params);
      return [] as T[];
    }

    return [] as T[];
  }

  return { query, legacy, osClients, inserts };
}

describe("osClientsDedupe", () => {
  it("dedupe por email en mismo workspace", () => {
    const a = buildClientDedupeKey(1, "Hello@Acme.com", "Other Name");
    const b = buildClientDedupeKey(1, "hello@acme.com", "Acme");
    expect(a).toBe(b);
  });

  it("dedupe por nombre si no hay email", () => {
    const k = buildClientDedupeKey(5, null, "  Acme Corp ");
    expect(k).toBe("ws:5|name:acme corp");
  });

  it("normaliza email", () => {
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
    expect(normalizeEmail("")).toBeNull();
  });

  it("mapLegacyStatus default active", () => {
    expect(mapLegacyStatus(null)).toBe("active");
    expect(mapLegacyStatus("archived")).toBe("archived");
    expect(mapLegacyStatus("churned")).toBe("archived");
  });

  it("LEGACY_SOURCE constante", () => {
    expect(LEGACY_SOURCE).toBe("etl:legacy:nelvyon_clients");
  });
});

describe("OsClientsBackfillService", () => {
  it("dry-run cuenta candidatos sin insertar", async () => {
    const db = makeBackfillDb();
    const svc = new OsClientsBackfillService(db);
    const report = await svc.run("dry-run");
    expect(report.legacyTotal).toBe(1);
    expect(report.candidatesNew).toBe(1);
    expect(report.appliedInserts).toBe(0);
    expect(db.inserts).toHaveLength(0);
  });

  it("apply inserta con metadata legacy", async () => {
    const db = makeBackfillDb();
    const svc = new OsClientsBackfillService(db);
    const report = await svc.run("apply");
    expect(report.appliedInserts).toBe(1);
    expect(db.inserts).toHaveLength(1);
    const metadata = JSON.parse(String(db.inserts[0]?.[24]));
    expect(metadata.source).toBe(LEGACY_SOURCE);
    expect(metadata.legacy_id).toBe(1);
    expect(metadata.contact_phone).toBe("+34600111222");
  });

  it("omite duplicado si os_clients ya tiene misma clave dedupe", async () => {
    const db = makeBackfillDb({
      os: [
        {
          id: "existing",
          legacy_nelvyon_client_id: null,
          workspace_id: 10,
          contact_email: "hello@acme.com",
          business_name: "Other",
        },
      ],
    });
    const svc = new OsClientsBackfillService(db);
    const report = await svc.run("dry-run");
    expect(report.duplicates).toBe(1);
    expect(report.candidatesNew).toBe(0);
  });

  it("skip filas ya migradas por legacy_nelvyon_client_id", async () => {
    const db = makeBackfillDb({
      os: [
        {
          id: "migrated",
          legacy_nelvyon_client_id: 1,
          workspace_id: 10,
          contact_email: "hello@acme.com",
          business_name: "Acme Corp",
        },
      ],
    });
    const svc = new OsClientsBackfillService(db);
    const report = await svc.run("dry-run");
    expect(report.skippedAlreadyMigrated).toBe(1);
    expect(report.candidatesNew).toBe(0);
  });

  it("detecta conflicto cuando varios legacy comparten dedupe", async () => {
    const db = makeBackfillDb({
      legacy: [
        {
          id: 1,
          user_id: "u1",
          workspace_id: 10,
          business_name: "Acme",
          sector: null,
          country: null,
          city: null,
          contact_email: "same@test.com",
          contact_phone: null,
          status: null,
          notes: null,
          objectives: null,
        },
        {
          id: 2,
          user_id: "u2",
          workspace_id: 10,
          business_name: "Acme B",
          sector: null,
          country: null,
          city: null,
          contact_email: "same@test.com",
          contact_phone: null,
          status: null,
          notes: null,
          objectives: null,
        },
      ],
    });
    const svc = new OsClientsBackfillService(db);
    const report = await svc.run("dry-run");
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0]?.legacyIds).toEqual([1, 2]);
    expect(report.candidatesNew).toBe(0);
  });
});
