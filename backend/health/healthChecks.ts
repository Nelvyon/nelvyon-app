// CONEXION ENTRE INQUILINOS: este modulo lo alcanzan rutas sin contexto de
// inquilino (sondas de salud, estado publico, aprobacion por token). Tras el
// cutover a `nelvyon_web_app` la conexion de peticion devolveria CERO FILAS sin
// error. `DbJobsClient` cae a `DATABASE_URL` mientras la variable dedicada no
// exista, asi que hoy no cambia ninguna conducta.
import { DbJobsClient } from "../db/DbJobsClient";
import { sanitizeEnvValue } from "../db/envSanitize";
import { isNelvyonAiEnabled } from "../private-ai/config";
import { isSesEnvConfigured, isStripeEnvConfigured, isOpenAiEnvConfigured, missingEnvKeys } from "../saas/saasEnv";

export type HealthCheckResult = {
  status: "ok" | "degraded" | "down";
  latencyMs: number;
  error?: string;
  /**
   * Lo que la sonda vio cuando fue bien.
   *
   * `error` solo aparece cuando algo falla, asi que un `ok` no podia decir NADA
   * de lo que encontro. Para el modelo local importa: «alcanzable» y
   * «alcanzable con seis modelos» no son la misma respuesta, y la segunda es la
   * que dice si de verdad se puede inferir.
   */
  detail?: string;
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
      await Promise.race([DbJobsClient.getInstance().query(`SELECT 1`), sleepReject(timeoutMs)]);
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
    // La sonda no gasta tokens —es un HEAD—, pero SI es una llamada externa a un
    // proveedor de IA, y el interruptor apagado significa cero. Ademas revela que
    // esta instancia habla con OpenAI a quien mire el trafico saliente.
    //
    // Se informa como `degraded` con el motivo explicito, que es lo que ya hace
    // esta funcion cuando falta configuracion: nunca un `ok` inventado.
    if (!isNelvyonAiEnabled()) {
      return {
        status: "degraded",
        latencyMs: Date.now() - started,
        error: "IA desactivada: NELVYON_AI_ENABLED=0",
      };
    }
    if (!isOpenAiEnvConfigured()) {
      return {
        status: "degraded",
        latencyMs: Date.now() - started,
        error: missingEnvKeys(["OPENAI_API_KEY"]).length
          ? `Missing: ${missingEnvKeys(["OPENAI_API_KEY"]).join(", ")}`
          : "OpenAI not configured",
      };
    }
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
 * El modelo LOCAL de NELVYON, mirado desde donde de verdad importa.
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * `checkOpenAI` mira al proveedor de PAGO, que en produccion esta apagado a
 * proposito. Del modelo que NELVYON usa de verdad —Ollama, autoalojado, coste
 * cero— no habia ninguna sonda. Y no es un detalle: en produccion el modelo vive
 * al otro lado de una red privada, asi que «esta configurado» y «se alcanza» son
 * dos cosas distintas, y solo se puede distinguir DESDE EL RUNTIME. Desde el
 * portatil de nadie.
 *
 * Sin esto, encender la IA era un acto de fe: la variable a 1 y a esperar que el
 * primer trabajo real descubriera si habia alguien al otro lado.
 *
 * ── NO CUESTA, Y ESO ESTA MEDIDO ────────────────────────────────────────────
 *
 * Listar modelos es una lectura de metadatos contra un servidor propio. La
 * politica de coste clasifica `ollama` como
 * `FREE_SELF_HOSTED_ON_EXISTING_HARDWARE`: ejecutable bajo el modo de coste
 * cero. Aqui no se llama a ningun proveedor facturable, ni siquiera si estuviera
 * configurado.
 *
 * ── QUE DEVUELVE, Y POR QUE ASI ─────────────────────────────────────────────
 *
 * `ok` solo si responde Y hay al menos un modelo instalado. Un servidor vivo sin
 * modelos no puede inferir: decir `ok` ahi seria exactamente el «configurado que
 * parece verificado» que esta sonda existe para impedir.
 */
export async function checkNelvyonAi(timeoutMs = 4000): Promise<HealthCheckResult> {
  return withGlobalCap(async () => {
    const started = Date.now();
    if (!isNelvyonAiEnabled()) {
      return {
        status: "degraded",
        latencyMs: Date.now() - started,
        error: "IA desactivada: NELVYON_AI_ENABLED=0",
      };
    }
    const base = (
      process.env.OLLAMA_HOST ??
      process.env.OLLAMA_BASE_URL ??
      process.env.NELVYON_LOCAL_AI_URL ??
      ""
    ).trim();
    if (!base) {
      return {
        status: "degraded",
        latencyMs: Date.now() - started,
        error: "Missing: OLLAMA_HOST",
      };
    }
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), timeoutMs);
      const res = await fetch(`${base.replace(/\/$/, "")}/api/tags`, { signal: ac.signal });
      clearTimeout(tid);
      if (!res.ok) {
        return {
          status: "degraded",
          latencyMs: Date.now() - started,
          error: `HTTP ${res.status}`,
        };
      }
      const cuerpo = (await res.json()) as { models?: Array<{ name?: string }> };
      const modelos = (cuerpo.models ?? []).filter((m) => typeof m?.name === "string").length;
      if (modelos === 0) {
        return {
          status: "degraded",
          latencyMs: Date.now() - started,
          error: "servidor alcanzable y sin modelos instalados",
        };
      }
      return { status: "ok", latencyMs: Date.now() - started, detail: `${modelos} modelos` };
    } catch {
      // No se filtra el motivo: la direccion del modelo es informacion de red
      // interna y esta sonda la puede llamar cualquiera con el secreto de cron.
      return {
        status: "down",
        latencyMs: Math.min(Date.now() - started, timeoutMs),
        error: PUBLIC_ERROR,
      };
    }
  });
}

/**
 * Stripe billing readiness: secret key, starter price ID, and API connectivity.
 */
export async function checkStripe(timeoutMs = 3000): Promise<HealthCheckResult> {
  return withGlobalCap(async () => {
    const started = Date.now();
    if (!isStripeEnvConfigured()) {
      const missing = missingEnvKeys([
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_PRICE_ID_STARTER",
        "STRIPE_PRICE_ID_PRO",
        "STRIPE_PRICE_ID_AGENCY",
      ]);
      return {
        status: "degraded",
        latencyMs: Date.now() - started,
        error: missing.length ? `Missing: ${missing.join(", ")}` : "Stripe not configured",
      };
    }
    const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? process.env.STRIPE_API_KEY?.trim();
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
 * SES: full credential set required for sellable email (aligned with saasEnv).
 */
export async function checkSES(): Promise<HealthCheckResult> {
  return withGlobalCap(async () => {
    const started = Date.now();
    if (!isSesEnvConfigured()) {
      const missing = missingEnvKeys(["SES_ACCESS_KEY_ID", "SES_SECRET_ACCESS_KEY", "SES_FROM_EMAIL"]);
      return {
        status: "degraded",
        latencyMs: Date.now() - started,
        error: missing.length ? `Missing: ${missing.join(", ")}` : "SES not configured",
      };
    }
    return { status: "ok", latencyMs: Date.now() - started };
  });
}

export type DeepHealthChecks = {
  database: HealthCheckResult;
  redis: HealthCheckResult;
  openai: HealthCheckResult;
  nelvyon_ai: HealthCheckResult;
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
    checkNelvyonAi(),
    checkStripe(),
    checkSES(),
  ]);

  const checks: DeepHealthChecks = {
    database: unwrapSettled(settled[0]!),
    redis: unwrapSettled(settled[1]!),
    openai: unwrapSettled(settled[2]!),
    nelvyon_ai: unwrapSettled(settled[3]!),
    stripe: unwrapSettled(settled[4]!),
    ses: unwrapSettled(settled[5]!),
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
