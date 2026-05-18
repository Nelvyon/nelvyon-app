import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node-cron", () => ({
  __esModule: true,
  default: {
    schedule: vi.fn(),
  },
}));

import cron from "node-cron";

import { OsCronMaintenance, osCronMaintenance } from "../cron/OsCronMaintenance";
import { startCronScheduler } from "../cron/cronScheduler";

describe("OsCronMaintenance", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("runMonthlyMaintenance con 0 servicios activos no encola jobs", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_service_contracts")) return [];
      if (sql.includes("INSERT INTO os_cron_logs")) return [];
      return [];
    });
    const enqueueAndDispatch = vi.fn();
    const m = new OsCronMaintenance({ db: { query }, orchestrator: { enqueueAndDispatch } });
    await m.runMonthlyMaintenance();
    expect(enqueueAndDispatch).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO os_cron_logs"),
      [0, 0],
    );
  });

  it("runMonthlyMaintenance con 0 servicios registra log con services_processed 0", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_service_contracts")) return [];
      if (sql.includes("INSERT INTO os_cron_logs")) return [];
      return [];
    });
    const m = new OsCronMaintenance({ db: { query }, orchestrator: { enqueueAndDispatch: vi.fn() } });
    await m.runMonthlyMaintenance();
    const insertCalls = query.mock.calls.filter((c) => String(c[0]).includes("INSERT INTO os_cron_logs"));
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    expect(insertCalls[0]?.[1]).toEqual([0, 0]);
  });

  it("runMonthlyMaintenance con 3 servicios activos encola 3 jobs", async () => {
    const rows = [
      { tenant_id: "t1", service_id: "web_premium", client_id: "c1" },
      { tenant_id: "t2", service_id: "seo_premium", client_id: "c2" },
      { tenant_id: "t3", service_id: "ads_premium", client_id: "c3" },
    ];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_service_contracts")) return rows;
      if (sql.includes("INSERT INTO os_cron_logs")) return [];
      return [];
    });
    const enqueueAndDispatch = vi.fn().mockResolvedValue({ jobId: "j1", status: "queued", message: "ok" });
    const m = new OsCronMaintenance({ db: { query }, orchestrator: { enqueueAndDispatch } });
    await m.runMonthlyMaintenance();
    expect(enqueueAndDispatch).toHaveBeenCalledTimes(3);
    expect(enqueueAndDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "c1",
        serviceId: "web_premium",
        payload: expect.objectContaining({
          trigger: "cron_monthly_maintenance",
          priority: "low",
          tenantId: "t1",
        }),
      }),
    );
  });

  it("runMonthlyMaintenance con error en un servicio continúa con los demás", async () => {
    const rows = [
      { tenant_id: "t1", service_id: "web_premium", client_id: "c1" },
      { tenant_id: "t2", service_id: "seo_premium", client_id: "c2" },
    ];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_service_contracts")) return rows;
      if (sql.includes("INSERT INTO os_cron_logs")) return [];
      return [];
    });
    const enqueueAndDispatch = vi
      .fn()
      .mockRejectedValueOnce(new Error("queue fail"))
      .mockResolvedValue({ jobId: "j2", status: "queued", message: "ok" });
    const m = new OsCronMaintenance({ db: { query }, orchestrator: { enqueueAndDispatch } });
    await m.runMonthlyMaintenance();
    expect(enqueueAndDispatch).toHaveBeenCalledTimes(2);
    const insertCalls = query.mock.calls.filter((c) => String(c[0]).includes("INSERT INTO os_cron_logs"));
    expect(insertCalls[0]?.[1]).toEqual([2, 1]);
  });

  it("inserta en os_cron_logs tras cada ejecución", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_service_contracts")) return [];
      if (sql.includes("INSERT INTO os_cron_logs")) return [];
      return [];
    });
    const m = new OsCronMaintenance({ db: { query }, orchestrator: { enqueueAndDispatch: vi.fn() } });
    await m.runMonthlyMaintenance();
    const insertSql = query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO os_cron_logs"))?.[0] as string;
    expect(insertSql).toContain("os_cron_logs");
    expect(insertSql).toContain("monthly_maintenance");
  });

  it("osCronMaintenance singleton es instancia de OsCronMaintenance", () => {
    expect(osCronMaintenance).toBeInstanceOf(OsCronMaintenance);
  });

  it("runMonthlyMaintenance pasa tenantId en payload", async () => {
    const rows = [{ tenant_id: "aaa-uuid", service_id: "web_premium", client_id: "cx" }];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_service_contracts")) return rows;
      if (sql.includes("INSERT INTO os_cron_logs")) return [];
      return [];
    });
    const enqueueAndDispatch = vi.fn().mockResolvedValue({ jobId: "j", status: "queued", message: "ok" });
    await new OsCronMaintenance({ db: { query }, orchestrator: { enqueueAndDispatch } }).runMonthlyMaintenance();
    expect(enqueueAndDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ tenantId: "aaa-uuid" }),
      }),
    );
  });

  it("runMonthlyMaintenance usa SELECT esperado sobre os_service_contracts", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_service_contracts")) return [];
      if (sql.includes("INSERT INTO os_cron_logs")) return [];
      return [];
    });
    await new OsCronMaintenance({ db: { query }, orchestrator: { enqueueAndDispatch: vi.fn() } }).runMonthlyMaintenance();
    const selectCall = query.mock.calls.find((c) => String(c[0]).includes("os_service_contracts"));
    expect(String(selectCall?.[0])).toContain("status = 'active'");
    expect(String(selectCall?.[0])).toContain("tenant_id");
  });

  it("runMonthlyMaintenance con todos fallidos error_count igual a total", async () => {
    const rows = [
      { tenant_id: "t1", service_id: "a", client_id: "c1" },
      { tenant_id: "t2", service_id: "b", client_id: "c2" },
    ];
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("FROM os_service_contracts")) return rows;
      if (sql.includes("INSERT INTO os_cron_logs")) return [];
      return [];
    });
    const enqueueAndDispatch = vi.fn().mockRejectedValue(new Error("fail"));
    await new OsCronMaintenance({ db: { query }, orchestrator: { enqueueAndDispatch } }).runMonthlyMaintenance();
    const insertCalls = query.mock.calls.filter((c) => String(c[0]).includes("INSERT INTO os_cron_logs"));
    expect(insertCalls[0]?.[1]).toEqual([2, 2]);
  });
});

describe("cronScheduler + node-cron", () => {
  beforeEach(() => {
    vi.mocked(cron.schedule).mockClear();
  });

  it("startCronScheduler arranca sin errores", () => {
    expect(() => startCronScheduler()).not.toThrow();
  });

  it("startCronScheduler registra schedule con expresión 0 3 1 * * (día 1, 03:00 UTC)", () => {
    startCronScheduler();
    expect(cron.schedule).toHaveBeenCalledWith("0 3 1 * *", expect.any(Function));
  });

  it("startCronScheduler registra health semanal 0 4 * * 1 (lunes 04:00 UTC)", () => {
    startCronScheduler();
    expect(cron.schedule).toHaveBeenCalledWith("0 4 * * 1", expect.any(Function));
  });

  it("startCronScheduler registra callback invocable (ejecuta runMonthlyMaintenance al invocar)", async () => {
    const spy = vi.spyOn(osCronMaintenance, "runMonthlyMaintenance").mockResolvedValue(undefined);
    startCronScheduler();
    const monthlyCb = vi.mocked(cron.schedule).mock.calls.find((c) => c[0] === "0 3 1 * *")?.[1] as () => Promise<void>;
    expect(typeof monthlyCb).toBe("function");
    await monthlyCb();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
