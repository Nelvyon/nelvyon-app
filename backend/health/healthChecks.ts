import { DbClient } from "../db/DbClient";
import { sanitizeEnvValue } from "../db/envSanitize";

export type HealthCheckResult = {
  status: "ok" | "degraded" | "down";
  latencyMs: number;
  error?: string;
};

const PUBLIC_ERROR = "Connection failed";
const GLOBAL_CAP_MS = 5000;

function sleepReject(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("TIMEOUT")), ms);
  });
}

function getUpstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_TOKEN;
  if (!url?.trim() || !token?.trim()) return null;
  return { url: url.replace(/\/$/, ""), token: token.trim() };
}

async function withGlobalCap(run: () => Promise<HealthCheckResult>): Promise<HealthCheckResult> {
  return Promise.race([
    run(),
    new Promise<HealthCheckResult>((resolve) => {
      setTimeout(() => {
        resolve({
          status: "degraded",
          latencyMs: GLOBAL_CAP_MS,
          error: "Check exceeded time limit",
        });
      }, GLOBAL_CAP_MS);
    }),
  ]);
}

/**
 * SELECT 1 against Postgres (Supabase). Timeout default 3s.
 * Exported `timeoutMs` for tests (fake timers).
 */
/** JWT_SECRET required for /api/auth/login (not exposed in response). */
export function checkAuthConfig(): HealthCheckResult {
  const secret = sanitizeEnvValue(process.env.JWT_SECRET);
  if (secret.length === 0) {
    return { status: "down", latencyMs: 0, error: "JWT_SECRET missing" };
  }
  if (secret.length < 32) {
    return { status: "down", latencyMs: 0, error: "JWT_SECRET too short" };
  }
  return { status: "ok", latencyMs: 0 };
}

export async function checkDatabase(timeoutMs = 3000): Promise<HealthCheckResult> {
  return withGlobalCap(async () => {
    const started = Date.now();
    try {
      await Promise.race([DbClient.getInstance().query(`SELECT 1`), sleepReject(timeoutMs)]);
      return { status: "ok", latencyMs: Date.now() - started };
    } catch {
      return {
        status: "down",
        latencyMs: Math.min(Date.now() - started, timeoutMs),
        error: PUBLIC_ERROR,
      };
    }
  });
}

/**
 * Upstash Redis REST PING. Timeout default 2s.
 */
export async function checkRedis(timeoutMs = 2000): Promise<HealthCheckResult> {
  return withGlobalCap(async () => {
    const started = Date.now();
    const config = getUpstashConfig();
    if (!config) {
      return { status: "degraded", latencyMs: Date.now() - started, error: "Not configured" };
    }
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), timeoutMs);
      const res = await fetch(`${config.url}/ping`, {
        method: "GET",
        headers: { Authorization: `Bearer ${config.token}` },
        signal: ac.signal,
      });
      clearTimeout(tid);
      if (!res.ok) {
        return { status: "down", latencyMs: Date.now() - started, error: PUBLIC_ERROR };
      }
      const body = (await res.json()) as { result?: string };
      if (body.result !== "PONG") {
        return { status: "down", latencyMs: Date.now() - started, error: PUBLIC_ERROR };
      }
      return { status: "ok", latencyMs: Date.now() - started };
    } catch {
      return {
        status: "down",
        latencyMs: Math.min(Date.now() - started, timeoutMs),
        error: PUBLIC_ERROR,
      };
    }
  });
}

function connectivityResult(started: number, res: Response): HealthCheckResult {
  if (res.status >= 500) {
    return { status: "degraded", latencyMs: Date.now() - started, error: "Service unavailable" };
  }
  return { status: "ok", latencyMs: Date.now() - started };
}

/**
 * HEAD https://api.openai.com — connectivity only (no tokens).
 */
export async function checkOpenAI(timeoutMs = 3000): Promise<HealthCheckResult> {
  return withGlobalCap(async () => {
    const started = Date.now();
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), timeoutMs);
      const res = await fetch("https://api.openai.com", { method: "HEAD", signal: ac.signal });
      clearTimeout(tid);
      return connectivityResult(started, res);
    } catch {
      return {
        status: "degraded",
        latencyMs: Math.min(Date.now() - started, timeoutMs),
        error: PUBLIC_ERROR,
      };
    }
  });
}

/**
 * HEAD https://api.stripe.com — connectivity only.
 */
export async function checkStripe(timeoutMs = 3000): Promise<HealthCheckResult> {
  return withGlobalCap(async () => {
    const started = Date.now();
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), timeoutMs);
      const res = await fetch("https://api.stripe.com", { method: "HEAD", signal: ac.signal });
      clearTimeout(tid);
      return connectivityResult(started, res);
    } catch {
      return {
        status: "degraded",
        latencyMs: Math.min(Date.now() - started, timeoutMs),
        error: PUBLIC_ERROR,
      };
    }
  });
}

/**
 * SES: only verifies SES_FROM_EMAIL is set (no AWS call).
 */
export async function checkSES(): Promise<HealthCheckResult> {
  return withGlobalCap(async () => {
    const started = Date.now();
    const from = process.env.SES_FROM_EMAIL?.trim();
    if (!from) {
      return { status: "degraded", latencyMs: Date.now() - started, error: "Not configured" };
    }
    return { status: "ok", latencyMs: Date.now() - started };
  });
}

export type DeepHealthChecks = {
  database: HealthCheckResult;
  redis: HealthCheckResult;
  openai: HealthCheckResult;
  stripe: HealthCheckResult;
  ses: HealthCheckResult;
};

function unwrapSettled(r: PromiseSettledResult<HealthCheckResult>): HealthCheckResult {
  if (r.status === "fulfilled") return r.value;
  return { status: "down", latencyMs: 0, error: PUBLIC_ERROR };
}

export function aggregateHealthStatus(checks: DeepHealthChecks): "healthy" | "degraded" | "unhealthy" {
  if (checks.database.status === "down" || checks.redis.status === "down") {
    return "unhealthy";
  }
  const values = Object.values(checks);
  if (values.some((c) => c.status !== "ok")) {
    return "degraded";
  }
  return "healthy";
}

export type DeepHealthPayload = {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: DeepHealthChecks;
};

export async function runDeepHealthChecks(): Promise<DeepHealthPayload> {
  const settled = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkOpenAI(),
    checkStripe(),
    checkSES(),
  ]);

  const checks: DeepHealthChecks = {
    database: unwrapSettled(settled[0]!),
    redis: unwrapSettled(settled[1]!),
    openai: unwrapSettled(settled[2]!),
    stripe: unwrapSettled(settled[3]!),
    ses: unwrapSettled(settled[4]!),
  };

  const status = aggregateHealthStatus(checks);

  return {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version?.trim() || "0.0.1",
    uptime: process.uptime(),
    checks,
  };
}

export function healthHttpStatus(overall: DeepHealthPayload["status"]): number {
  return overall === "unhealthy" ? 503 : 200;
}
