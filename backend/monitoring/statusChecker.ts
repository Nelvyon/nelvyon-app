import { DbClient } from "../db/DbClient";

export type ServiceStatus = "up" | "down" | "degraded";

export interface ServiceCheck {
  name: string;
  url: string;
  expectedStatus: number;
}

export const SERVICES_TO_CHECK: ServiceCheck[] = [
  { name: "api", url: "/api/health", expectedStatus: 200 },
  { name: "database", url: "/api/health", expectedStatus: 200 },
  { name: "agents", url: "/api/os/health", expectedStatus: 200 },
  { name: "payments", url: "https://api.stripe.com", expectedStatus: 200 },
  { name: "email", url: "https://email.us-east-1.amazonaws.com", expectedStatus: 200 },
];

export async function checkService(
  service: ServiceCheck,
  baseUrl: string,
): Promise<{ status: ServiceStatus; latencyMs: number }> {
  const url = service.url.startsWith("http") ? service.url : `${baseUrl}${service.url}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
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

export async function runAllChecks(baseUrl: string): Promise<void> {
  const db = DbClient.getInstance();
  for (const service of SERVICES_TO_CHECK) {
    const { status, latencyMs } = await checkService(service, baseUrl);
    await db.query(
      `INSERT INTO status_checks (service, status, latency_ms)
       VALUES ($1, $2, $3)`,
      [service.name, status, latencyMs],
    );
  }
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
