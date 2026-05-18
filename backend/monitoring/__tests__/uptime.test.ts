import { describe, expect, it, vi } from "vitest";

vi.mock("node-cron", () => ({
  __esModule: true,
  default: {
    schedule: vi.fn(),
  },
}));

import cron from "node-cron";

import { UptimeService } from "../UptimeService";

describe("UptimeService", () => {
  it("checkService OK", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "1",
        serviceName: "database",
        status: "operational",
        responseMs: 5,
        checkedAt: new Date().toISOString(),
        errorMessage: null,
      },
    ]);
    const svc = new UptimeService({ db: { query }, redis: { ping: vi.fn().mockResolvedValue("PONG") } });
    const row = await svc.checkService("database", async () => undefined);
    expect(row.status).toBe("operational");
  });

  it("checkService con error guarda degraded", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "2",
        serviceName: "redis",
        status: "degraded",
        responseMs: 10,
        checkedAt: new Date().toISOString(),
        errorMessage: "fail",
      },
    ]);
    const svc = new UptimeService({ db: { query }, redis: { ping: vi.fn().mockResolvedValue("PONG") } });
    const row = await svc.checkService("redis", async () => {
      throw new Error("fail");
    });
    expect(row.status).toBe("degraded");
    const insert = query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO uptime_checks"));
    expect(insert?.[1]?.[1]).toBe("degraded");
  });

  it("checkAll ejecuta database, redis y api", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO uptime_checks")) {
        return [{ id: crypto.randomUUID(), serviceName: "x", status: "operational", responseMs: 2, checkedAt: new Date().toISOString(), errorMessage: null }];
      }
      return [{ ok: 1 }];
    });
    const ping = vi.fn().mockResolvedValue("PONG");
    const svc = new UptimeService({ db: { query }, redis: { ping } });
    const out = await svc.checkAll();
    expect(out).toHaveLength(3);
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("getStatus operational", async () => {
    const query = vi.fn().mockResolvedValue([
      { id: "1", serviceName: "database", status: "operational", responseMs: 5, checkedAt: new Date().toISOString(), errorMessage: null },
      { id: "2", serviceName: "redis", status: "operational", responseMs: 3, checkedAt: new Date().toISOString(), errorMessage: null },
    ]);
    const svc = new UptimeService({ db: { query }, redis: { ping: vi.fn().mockResolvedValue("PONG") } });
    const status = await svc.getStatus();
    expect(status.overall).toBe("operational");
  });

  it("getStatus degraded", async () => {
    const query = vi.fn().mockResolvedValue([
      { id: "1", serviceName: "database", status: "operational", responseMs: 5, checkedAt: new Date().toISOString(), errorMessage: null },
      { id: "2", serviceName: "redis", status: "degraded", responseMs: 3, checkedAt: new Date().toISOString(), errorMessage: "timeout" },
    ]);
    const svc = new UptimeService({ db: { query }, redis: { ping: vi.fn().mockResolvedValue("PONG") } });
    const status = await svc.getStatus();
    expect(status.overall).toBe("degraded");
  });

  it("getHistory", async () => {
    const query = vi.fn().mockResolvedValue([
      { id: "1", serviceName: "api", status: "operational", responseMs: 9, checkedAt: new Date().toISOString(), errorMessage: null },
    ]);
    const svc = new UptimeService({ db: { query }, redis: { ping: vi.fn().mockResolvedValue("PONG") } });
    const rows = await svc.getHistory(12);
    expect(rows).toHaveLength(1);
    expect(String(query.mock.calls[0]?.[0])).toContain("hours");
  });

  it("getIncidents", async () => {
    const query = vi.fn().mockResolvedValue([
      { id: "inc-1", serviceName: "api", title: "API slow", status: "investigating", startedAt: new Date().toISOString(), resolvedAt: null, description: "Investigating" },
    ]);
    const svc = new UptimeService({ db: { query }, redis: { ping: vi.fn().mockResolvedValue("PONG") } });
    const incidents = await svc.getIncidents();
    expect(incidents[0]?.status).toBe("investigating");
  });

  it("schedule setup", () => {
    const svc = new UptimeService({ db: { query: vi.fn().mockResolvedValue([]) }, redis: { ping: vi.fn().mockResolvedValue("PONG") } });
    svc.scheduleChecks();
    expect(cron.schedule).toHaveBeenCalledWith("*/5 * * * *", expect.any(Function));
  });
});
