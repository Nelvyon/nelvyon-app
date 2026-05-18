import { describe, expect, it, vi } from "vitest";

import { OsHealthCheck, osHealthCheck } from "../healthcheck/OsHealthCheck";

const TENANT = "00000000-0000-0000-0000-0000000000bb";
const CLIENT = "client-health-1";

describe("OsHealthCheck", () => {
  it("checkClient con 0 jobs → healthy e incluye aviso de inactividad", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) return [];
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    const hc = new OsHealthCheck({ db: { query } });
    const r = await hc.checkClient(CLIENT, TENANT);
    expect(r.status).toBe("healthy");
    expect(r.jobsLastWeek).toBe(0);
    expect(r.issues).toContain("Sin actividad en los últimos 7 días");
  });

  it("checkClient con errorRate > 0.5 → critical", async () => {
    const jobs = [
      ...Array.from({ length: 4 }, () => ({ status: "completed", duration_ms: 1000 })),
      ...Array.from({ length: 6 }, () => ({ status: "failed", duration_ms: 500 })),
    ];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) return jobs;
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    const r = await new OsHealthCheck({ db: { query } }).checkClient(CLIENT, TENANT);
    expect(r.errorRate).toBeCloseTo(0.6, 5);
    expect(r.status).toBe("critical");
  });

  it("checkClient con dos issues operativas → critical", async () => {
    const jobs = [
      ...Array.from({ length: 6 }, () => ({ status: "failed", duration_ms: 35000 })),
      ...Array.from({ length: 4 }, () => ({ status: "completed", duration_ms: 35000 })),
    ];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) return jobs;
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    const r = await new OsHealthCheck({ db: { query } }).checkClient(CLIENT, TENANT);
    expect(r.issues.length).toBeGreaterThanOrEqual(2);
    expect(r.status).toBe("critical");
  });

  it("checkClient con tasa de error ~40% (una issue) → warning", async () => {
    const jobs = [
      ...Array.from({ length: 6 }, () => ({ status: "completed", duration_ms: 800 })),
      ...Array.from({ length: 4 }, () => ({ status: "failed", duration_ms: 800 })),
    ];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) return jobs;
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    const r = await new OsHealthCheck({ db: { query } }).checkClient(CLIENT, TENANT);
    expect(r.errorRate).toBeCloseTo(0.4, 5);
    expect(r.issues.some((i) => i.includes("Tasa de error"))).toBe(true);
    expect(r.status).toBe("warning");
  });

  it("checkClient con jobs rápidos y sin fallos → healthy, issues vacías salvo sin inactividad", async () => {
    const jobs = [
      { status: "completed", duration_ms: 100 },
      { status: "completed", duration_ms: 200 },
    ];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) return jobs;
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    const r = await new OsHealthCheck({ db: { query } }).checkClient(CLIENT, TENANT);
    expect(r.status).toBe("healthy");
    expect(r.issues).toEqual([]);
    expect(r.errorRate).toBe(0);
  });

  it("checkClient persiste fila en os_health_reports", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) return [{ status: "completed", duration_ms: 0 }];
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    await new OsHealthCheck({ db: { query } }).checkClient(CLIENT, TENANT);
    const insert = query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO os_health_reports"));
    expect(insert).toBeDefined();
    expect(String(insert?.[0])).toContain("issues");
    expect(insert?.[1]?.[0]).toBe(CLIENT);
    expect(insert?.[1]?.[1]).toBe(TENANT);
  });

  it("checkClient calcula avgDurationMs correctamente", async () => {
    const jobs = [
      { status: "completed", duration_ms: 1000 },
      { status: "completed", duration_ms: 2000 },
      { status: "completed", duration_ms: 4000 },
    ];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) return jobs;
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    const r = await new OsHealthCheck({ db: { query } }).checkClient(CLIENT, TENANT);
    expect(r.avgDurationMs).toBeCloseTo(7000 / 3, 5);
  });

  it("checkClient cuenta pendingUpsells", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) return [{ status: "completed", duration_ms: 100 }];
      if (sql.includes("os_upsell_suggestions")) return [{ id: "1" }, { id: "2" }];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    const r = await new OsHealthCheck({ db: { query } }).checkClient(CLIENT, TENANT);
    expect(r.pendingUpsells).toBe(2);
  });

  it("checkClient jobs lentos añade issue y puede ser warning", async () => {
    const jobs = [{ status: "completed", duration_ms: 35000 }];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) return jobs;
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    const r = await new OsHealthCheck({ db: { query } }).checkClient(CLIENT, TENANT);
    expect(r.issues.some((i) => i.includes("Jobs lentos"))).toBe(true);
    expect(r.status).toBe("warning");
  });

  it("runWeeklyHealthCheck con 3 clientes devuelve 3 reportes", async () => {
    const clients = [
      { client_id: "a", tenant_id: TENANT },
      { client_id: "b", tenant_id: TENANT },
      { client_id: "c", tenant_id: TENANT },
    ];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("os_service_contracts")) return clients;
      if (sql.includes("FROM os_jobs")) return [];
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    const reports = await new OsHealthCheck({ db: { query } }).runWeeklyHealthCheck();
    expect(reports).toHaveLength(3);
    expect(new Set(reports.map((r) => r.clientId)).size).toBe(3);
  });

  it("runWeeklyHealthCheck con error en un cliente continúa con los demás", async () => {
    const clients = [
      { client_id: "ok1", tenant_id: TENANT },
      { client_id: "boom", tenant_id: TENANT },
      { client_id: "ok2", tenant_id: TENANT },
    ];
    const query = vi.fn().mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes("os_service_contracts")) return clients;
      if (sql.includes("FROM os_jobs")) {
        const clientId = params?.[0];
        if (clientId === "boom") throw new Error("db fail");
        return [];
      }
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    const reports = await new OsHealthCheck({ db: { query } }).runWeeklyHealthCheck();
    expect(reports).toHaveLength(2);
    expect(reports.map((r) => r.clientId).sort()).toEqual(["ok1", "ok2"]);
  });

  it("osHealthCheck singleton es instancia de OsHealthCheck", () => {
    expect(osHealthCheck).toBeInstanceOf(OsHealthCheck);
  });

  it("checkClient consulta os_jobs con ventana de 7 días", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_jobs")) {
        expect(sql).toContain("created_at >=");
        return [];
      }
      if (sql.includes("os_upsell_suggestions")) return [];
      if (sql.includes("INSERT INTO os_health_reports")) return [];
      return [];
    });
    await new OsHealthCheck({ db: { query } }).checkClient(CLIENT, TENANT);
    expect(query).toHaveBeenCalled();
  });
});
