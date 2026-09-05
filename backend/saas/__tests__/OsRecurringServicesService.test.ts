import { describe, it, expect } from "vitest";
import { OsRecurringServicesService } from "../OsRecurringServicesService";

const TENANT = "tenant-xyz";
const MONTH  = "2026-06";

type QueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>;

function makeSvc(queryFn: QueryFn) {
  // `DbClient.query` es generico —devuelve lo que pida quien llama— y un doble
  // no puede saber ese tipo. Se adapta aqui, una vez, en lugar de convertir el
  // objeto entero: asi `sql` y `params` siguen comprobandose de verdad.
  const query = async <T,>(sql: string, params?: unknown[]): Promise<T[]> =>
    (await queryFn(sql, params)) as T[];
  return new OsRecurringServicesService({ db: { query } });
}

const deliverableRow = (type: string) => ({
  id: `id-${type}`,
  tenantId: TENANT,
  month: MONTH,
  serviceType: type,
  payload: { type },
  status: "generated",
  createdAt: "2026-06-01T08:00:00Z",
});

// ── generateMonthlyDeliverables ───────────────────────────────────────────────

describe("generateMonthlyDeliverables", () => {
  it("inserts 3 service types and returns all 3 deliverables", async () => {
    const inserted: string[] = [];
    const svc = makeSvc(async (sql, params) => {
      const p = params as unknown[];
      const type = String(p[2]);
      inserted.push(type);
      return [deliverableRow(type)];
    });
    const result = await svc.generateMonthlyDeliverables(TENANT, MONTH);
    expect(result).toHaveLength(3);
    expect(inserted).toContain("seo_report");
    expect(inserted).toContain("social_calendar");
    expect(inserted).toContain("ads_snapshot");
  });

  it("returns empty array when all deliverables already exist (ON CONFLICT DO NOTHING)", async () => {
    const svc = makeSvc(async () => []); // DB returns nothing (conflict)
    const result = await svc.generateMonthlyDeliverables(TENANT, MONTH);
    expect(result).toHaveLength(0);
  });

  it("throws VALIDATION error for invalid month format", async () => {
    const svc = makeSvc(async () => []);
    await expect(svc.generateMonthlyDeliverables(TENANT, "June-2026")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("uses ON CONFLICT DO NOTHING to ensure idempotency", async () => {
    let capturedSql = "";
    const svc = makeSvc(async (sql, params) => {
      capturedSql = sql;
      const p = params as unknown[];
      return [deliverableRow(String(p[2]))];
    });
    await svc.generateMonthlyDeliverables(TENANT, MONTH);
    expect(capturedSql).toContain("ON CONFLICT");
    expect(capturedSql).toContain("DO NOTHING");
  });

  it("seo_report payload includes sections and title", async () => {
    const capturedCapturados: Record<string, unknown>[] = [];
    const svc = makeSvc(async (sql, params) => {
      const p = params as unknown[];
      if (p[2] === "seo_report") {
        capturedCapturados.push(JSON.parse(String(p[3])) as Record<string, unknown>);
        return [deliverableRow("seo_report")];
      }
      return [deliverableRow(String(p[2]))];
    });
    await svc.generateMonthlyDeliverables(TENANT, MONTH);
    expect(capturedCapturados, "no se capturo ningun payload").toHaveLength(1);
    expect(capturedCapturados[0].title).toContain(MONTH);
    expect(Array.isArray(capturedCapturados[0].sections)).toBe(true);
  });

  it("social_calendar payload includes weeks array with posts", async () => {
    const calCapturados: Record<string, unknown>[] = [];
    const svc = makeSvc(async (sql, params) => {
      const p = params as unknown[];
      if (p[2] === "social_calendar") {
        calCapturados.push(JSON.parse(String(p[3])) as Record<string, unknown>);
        return [deliverableRow("social_calendar")];
      }
      return [deliverableRow(String(p[2]))];
    });
    await svc.generateMonthlyDeliverables(TENANT, MONTH);
    expect(Array.isArray(calCapturados[0].weeks)).toBe(true);
    const weeks = calCapturados[0].weeks as Array<{ posts: unknown[] }>;
    expect(weeks.length).toBe(4);
    expect(weeks[0]?.posts.length).toBe(3);
  });

  it("ads_snapshot payload includes channels array", async () => {
    const adsCapturados: Record<string, unknown>[] = [];
    const svc = makeSvc(async (sql, params) => {
      const p = params as unknown[];
      if (p[2] === "ads_snapshot") {
        adsCapturados.push(JSON.parse(String(p[3])) as Record<string, unknown>);
        return [deliverableRow("ads_snapshot")];
      }
      return [deliverableRow(String(p[2]))];
    });
    await svc.generateMonthlyDeliverables(TENANT, MONTH);
    expect(Array.isArray(adsCapturados[0].channels)).toBe(true);
    const ch = adsCapturados[0].channels as Array<{ name: string }>;
    expect(ch.map(c => c.name)).toContain("Meta Ads");
    expect(ch.map(c => c.name)).toContain("Google Ads");
  });
});

// ── listDeliverables ──────────────────────────────────────────────────────────

describe("listDeliverables", () => {
  it("returns list filtered by tenantId", async () => {
    const rows = ["seo_report", "social_calendar", "ads_snapshot"].map(deliverableRow);
    const svc = makeSvc(async () => rows);
    const result = await svc.listDeliverables(TENANT);
    expect(result).toHaveLength(3);
    expect(result[0].serviceType).toBe("seo_report");
  });

  it("passes month filter when provided", async () => {
    let capturedSql = "";
    const svc = makeSvc(async (sql) => { capturedSql = sql; return []; });
    await svc.listDeliverables(TENANT, MONTH);
    expect(capturedSql).toContain("month=$2");
  });
});

// ── markDelivered ─────────────────────────────────────────────────────────────

describe("markDelivered", () => {
  it("returns true when update succeeds", async () => {
    const svc = makeSvc(async () => [{ id: "id-1" }]);
    expect(await svc.markDelivered(TENANT, "id-1")).toBe(true);
  });

  it("returns false when deliverable not found", async () => {
    const svc = makeSvc(async () => []);
    expect(await svc.markDelivered(TENANT, "no-id")).toBe(false);
  });
});
