import { describe, it, expect } from "vitest";
import { OsRecurringServicesService } from "../OsRecurringServicesService";

const TENANT = "tenant-xyz";
const MONTH  = "2026-06";

type QueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>;

function makeSvc(queryFn: QueryFn) {
  return new OsRecurringServicesService({ db: { query: queryFn } as Parameters<typeof OsRecurringServicesService.prototype.constructor>[0]["db"] });
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
    let capturedPayload: Record<string, unknown> | null = null;
    const svc = makeSvc(async (sql, params) => {
      const p = params as unknown[];
      if (p[2] === "seo_report") {
        capturedPayload = JSON.parse(String(p[3])) as Record<string, unknown>;
        return [deliverableRow("seo_report")];
      }
      return [deliverableRow(String(p[2]))];
    });
    await svc.generateMonthlyDeliverables(TENANT, MONTH);
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload?.title).toContain(MONTH);
    expect(Array.isArray(capturedPayload?.sections)).toBe(true);
  });

  it("social_calendar payload includes weeks array with posts", async () => {
    let calPayload: Record<string, unknown> | null = null;
    const svc = makeSvc(async (sql, params) => {
      const p = params as unknown[];
      if (p[2] === "social_calendar") {
        calPayload = JSON.parse(String(p[3])) as Record<string, unknown>;
        return [deliverableRow("social_calendar")];
      }
      return [deliverableRow(String(p[2]))];
    });
    await svc.generateMonthlyDeliverables(TENANT, MONTH);
    expect(Array.isArray(calPayload?.weeks)).toBe(true);
    const weeks = calPayload?.weeks as Array<{ posts: unknown[] }>;
    expect(weeks.length).toBe(4);
    expect(weeks[0]?.posts.length).toBe(3);
  });

  it("ads_snapshot payload includes channels array", async () => {
    let adsPayload: Record<string, unknown> | null = null;
    const svc = makeSvc(async (sql, params) => {
      const p = params as unknown[];
      if (p[2] === "ads_snapshot") {
        adsPayload = JSON.parse(String(p[3])) as Record<string, unknown>;
        return [deliverableRow("ads_snapshot")];
      }
      return [deliverableRow(String(p[2]))];
    });
    await svc.generateMonthlyDeliverables(TENANT, MONTH);
    expect(Array.isArray(adsPayload?.channels)).toBe(true);
    const ch = adsPayload?.channels as Array<{ name: string }>;
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
