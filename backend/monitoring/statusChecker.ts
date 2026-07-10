import { DbClient } from "../db/DbClient";
import {
  checkDatabase,
  checkSES,
  checkStripe,
  type HealthCheckResult,
} from "../health/healthChecks";

export type ServiceStatus = "up" | "down" | "degraded";

export interface ServiceCheck {
  name: string;
  url: string;
  expectedStatus: number;
}

/** Internal HTTP probes for public status page. */
export const HTTP_SERVICES_TO_CHECK: ServiceCheck[] = [
  { name: "api", url: "/api/health/live", expectedStatus: 200 },
  { name: "agents", url: "/api/os/health", expectedStatus: 200 },
];

function mapHealthToService(status: HealthCheckResult["status"]): ServiceStatus {
  if (status === "ok") return "up";
  if (status === "degraded") return "degraded";
  return "down";
}

export async function checkService(
  service: ServiceCheck,
  baseUrl: string,
): Promise<{ status: ServiceStatus; latencyMs: number }> {
  const url = service.url.startsWith("http") ? service.url : `${baseUrl.replace(/\/$/, "")}${service.url}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const latencyMs = Date.now() - start;
    if (res.status === service.expectedStatus) {
      return { status: latencyMs > 2000 ? "degraded" : "up", latencyMs };
    }
    return { status: "down", latencyMs };
  } catch {
    return { status: "down", latencyMs: Date.now() - start };
  }
}

async function persistCheck(
  db: ReturnType<typeof DbClient.getInstance>,
  service: string,
  status: ServiceStatus,
  latencyMs: number,
): Promise<void> {
  await db.query(
    `INSERT INTO status_checks (service, status, latency_ms)
     VALUES ($1, $2, $3)`,
    [service, status, latencyMs],
  );
}

export async function runAllChecks(baseUrl: string): Promise<void> {
  const db = DbClient.getInstance();

  for (const service of HTTP_SERVICES_TO_CHECK) {
    const { status, latencyMs } = await checkService(service, baseUrl);
    await persistCheck(db, service.name, status, latencyMs);
  }

  const database = await checkDatabase();
  await persistCheck(db, "database", mapHealthToService(database.status), database.latencyMs);

  const stripe = await checkStripe();
  await persistCheck(db, "payments", mapHealthToService(stripe.status), stripe.latencyMs);

  const ses = await checkSES();
  await persistCheck(db, "email", mapHealthToService(ses.status), ses.latencyMs);

  await db.query(
    `DELETE FROM status_checks
     WHERE checked_at < now() - interval '7 days'`,
  );
}

export async function getCurrentStatus(): Promise<
  Record<string, { status: ServiceStatus; latencyMs: number; checkedAt: string }>
> {
  const db = DbClient.getInstance();
  const rows = await db.query<{
    service: string;
    status: string;
    latency_ms: number;
    checked_at: string;
  }>(
    `SELECT DISTINCT ON (service) service, status, latency_ms, checked_at
     FROM status_checks
     ORDER BY service, checked_at DESC`,
  );
  return Object.fromEntries(
    rows.map((r) => [
      r.service,
      {
        status: r.status as ServiceStatus,
        latencyMs: r.latency_ms,
        checkedAt: r.checked_at,
      },
    ]),
  );
}

/** @deprecated use HTTP_SERVICES_TO_CHECK — kept for tests importing SERVICES_TO_CHECK */
export const SERVICES_TO_CHECK: ServiceCheck[] = HTTP_SERVICES_TO_CHECK;
