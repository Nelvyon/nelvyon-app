import cron from "node-cron";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { RedisClient } from "../db/RedisClient";
import { RedisClient as RedisClientClass } from "../db/RedisClient";

export type UptimeServiceState = "operational" | "degraded" | "outage";

export interface UptimeCheck {
  id: string;
  serviceName: string;
  status: UptimeServiceState | "operational" | "degraded";
  responseMs: number | null;
  checkedAt: string;
  errorMessage: string | null;
}

export interface UptimeIncident {
  id: string;
  serviceName: string;
  title: string;
  status: string;
  startedAt: string;
  resolvedAt: string | null;
  description: string | null;
}

export interface UptimeStatus {
  overall: UptimeServiceState;
  services: UptimeCheck[];
  checkedAt: string;
}

type ScheduleFn = (expression: string, callback: () => Promise<void>) => void;
type RedisPort = Pick<RedisClient, "ping">;

export type UptimeServiceDeps = {
  db?: Pick<DbClient, "query">;
  redis?: RedisPort;
  schedule?: ScheduleFn;
};

function nowIso(): string {
  return new Date().toISOString();
}

export class UptimeService {
  constructor(private readonly deps: UptimeServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get redis(): RedisPort {
    return this.deps.redis ?? RedisClientClass.getInstance();
  }

  private get schedule(): ScheduleFn {
    return this.deps.schedule ?? cron.schedule;
  }

  async checkService(serviceName: string, checkFn: () => Promise<void>): Promise<UptimeCheck> {
    const started = Date.now();
    let status: "operational" | "degraded" = "operational";
    let errorMessage: string | null = null;
    try {
      await checkFn();
    } catch (error: unknown) {
      status = "degraded";
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    const responseMs = Date.now() - started;

    const rows = await this.db.query<UptimeCheck>(
      `INSERT INTO uptime_checks (service_name, status, response_ms, error_message)
       VALUES ($1, $2, $3, $4)
       RETURNING id,
                 service_name as "serviceName",
                 status,
                 response_ms as "responseMs",
                 checked_at as "checkedAt",
                 error_message as "errorMessage"`,
      [serviceName, status, responseMs, errorMessage],
    );
    const row = rows[0];
    if (!row) throw new Error("UptimeService.checkService: INSERT returned no row");
    return row;
  }

  async checkAll(): Promise<UptimeCheck[]> {
    const checks = await Promise.all([
      this.checkService("database", async () => {
        await this.db.query<{ ok: number }>(`SELECT 1 as ok`);
      }),
      this.checkService("redis", async () => {
        await this.redis.ping();
      }),
      this.checkService("api", async () => {
        await this.db.query<{ ok: number }>(`SELECT 1 as ok`);
      }),
    ]);
    return checks;
  }

  async getStatus(): Promise<UptimeStatus> {
    const services = await this.db.query<UptimeCheck>(
      `SELECT DISTINCT ON (service_name)
          id,
          service_name as "serviceName",
          status,
          response_ms as "responseMs",
          checked_at as "checkedAt",
          error_message as "errorMessage"
       FROM uptime_checks
       ORDER BY service_name, checked_at DESC`,
    );

    const degraded = services.filter((s) => s.status !== "operational").length;
    let overall: UptimeServiceState = "operational";
    if (services.length > 0 && degraded === services.length) overall = "outage";
    else if (degraded > 0) overall = "degraded";

    return {
      overall,
      services,
      checkedAt: services[0]?.checkedAt ?? nowIso(),
    };
  }

  async getHistory(hours = 24): Promise<UptimeCheck[]> {
    const safeHours = Math.max(1, Math.min(168, Math.floor(hours)));
    return this.db.query<UptimeCheck>(
      `SELECT id,
              service_name as "serviceName",
              status,
              response_ms as "responseMs",
              checked_at as "checkedAt",
              error_message as "errorMessage"
       FROM uptime_checks
       WHERE checked_at >= NOW() - ($1::text || ' hours')::interval
       ORDER BY checked_at DESC`,
      [String(safeHours)],
    );
  }

  async getIncidents(): Promise<UptimeIncident[]> {
    return this.db.query<UptimeIncident>(
      `SELECT id,
              service_name as "serviceName",
              title,
              status,
              started_at as "startedAt",
              resolved_at as "resolvedAt",
              description
       FROM uptime_incidents
       WHERE resolved_at IS NULL
       ORDER BY started_at DESC`,
    );
  }

  scheduleChecks(): void {
    this.schedule("*/5 * * * *", async () => {
      await this.checkAll();
    });
  }
}

export const uptimeService = new UptimeService();
