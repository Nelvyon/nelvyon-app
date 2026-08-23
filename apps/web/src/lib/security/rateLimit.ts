import type { NextRequest } from "next/server";
import { checkInMemoryRateLimit } from "./inMemoryRateLimit";

export interface RateLimitRule {
  id: string;
  match: (pathname: string) => boolean;
  limit: number;
  windowSec: number;
  requireSharedStoreInProduction?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

const RULES: RateLimitRule[] = [
  {
    id: "auth-signup",
    match: (p) => p === "/api/auth/register" || p === "/api/auth/signup",
    limit: 5,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "auth-login",
    match: (p) => p === "/api/auth/login",
    limit: 10,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "auth-forgot-password",
    match: (p) => p === "/api/auth/forgot-password" || p === "/api/auth/reset-password",
    limit: 5,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "portal-auth-login",
    match: (p) => p === "/api/platform/portal/auth/login",
    limit: 10,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "saas-sms",
    match: (p) => p === "/api/saas/sms",
    limit: 10,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "lms-enroll",
    match: (p) => /^\/api\/lms\/courses\/[^/]+\/enroll$/.test(p),
    limit: 10,
    windowSec: 60,
  },
  {
    id: "lms-progress-write",
    match: (p) => /^\/api\/lms\/progress\/[^/]+\/lesson\/[^/]+$/.test(p),
    limit: 30,
    windowSec: 60,
  },
  {
    id: "public-api",
    match: (p) => p.startsWith("/api/public/"),
    limit: 30,
    windowSec: 60,
  },
  {
    id: "webhooks",
    match: (p) => p.startsWith("/api/webhooks/"),
    limit: 200,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "early-adopter",
    match: (p) => p.startsWith("/api/early-adopter/"),
    limit: 20,
    windowSec: 60,
  },
  {
    id: "contact",
    match: (p) => p === "/api/contact",
    limit: 10,
    windowSec: 60,
  },
  {
    id: "waitlist",
    match: (p) => p === "/api/waitlist",
    limit: 10,
    windowSec: 60,
  },
  {
    id: "form-submit",
    match: (p) => /^\/api\/forms\/[^/]+\/submit$/.test(p),
    limit: 20,
    windowSec: 60,
  },
  {
    id: "site-chat",
    match: (p) => p === "/api/nelvyon-site/chat",
    limit: 15,
    windowSec: 60,
  },
  {
    id: "saas-crm-export",
    match: (p) => p === "/api/saas/crm/contacts/export" || p === "/api/saas/crm/contacts/import",
    limit: 10,
    windowSec: 60,
  },
  {
    id: "saas-gdpr",
    match: (p) => p.startsWith("/api/saas/compliance/gdpr"),
    limit: 10,
    windowSec: 60,
  },
  {
    id: "saas-campania-launch",
    match: (p) => /^\/api\/saas\/campanias\/[^/]+\/launch$/.test(p),
    limit: 5,
    windowSec: 60,
  },
  {
    id: "saas-webhook-in",
    match: (p) => p === "/api/saas/workflows/webhook-in",
    limit: 60,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "saas-audit",
    match: (p) => p.startsWith("/api/saas/audit"),
    limit: 30,
    windowSec: 60,
  },

  // ── Huecos encontrados en el barrido de cobertura (2026-08) ──────────────
  //
  // El middleware cubria login, registro y reset, pero NO estas. Las cuatro
  // pasan por `middleware.ts` —el matcher incluye `/api/auth/:path*`— asi que
  // el problema no era que no se ejecutara: era que `getRateLimitRule` devolvia
  // `null` y la peticion seguia sin cupo.
  {
    // Sin sesion y con un token en la URL: es una superficie de ADIVINACION.
    // Sin cupo, probar tokens de verificacion sale gratis.
    id: "auth-verify-email",
    match: (p) => p === "/api/auth/verify-email",
    limit: 10,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    // Los tres endpoints de SSO son ANONIMOS por naturaleza, y el callback
    // ademas provoca una peticion SALIENTE al proveedor del inquilino. Sin
    // cupo, NELVYON se convierte en un amplificador: cada llamada aqui genera
    // una llamada nuestra a un tercero.
    //
    // El guardia de SSRF impide que ese tercero sea la red interna, pero no
    // impide el volumen. Son dos problemas distintos y hacen falta los dos.
    id: "auth-sso",
    match: (p) => p.startsWith("/api/auth/sso/"),
    limit: 20,
    windowSec: 60,
    requireSharedStoreInProduction: true,
  },
  {
    id: "auth-token",
    match: (p) => p === "/api/auth/token",
    limit: 30,
    windowSec: 60,
  },
  {
    // Autenticada, pero es dinero: conviene un techo aunque haya sesion.
    id: "billing-checkout",
    match: (p) => p === "/api/billing/checkout",
    limit: 10,
    windowSec: 60,
  },
];

export function getRateLimitRule(pathname: string): RateLimitRule | null {
  return RULES.find((r) => r.match(pathname)) ?? null;
}

/** Saltos de proxy de confianza. Misma variable que usa el lado Python. */
function saltosDeProxyConfiables(): number {
  const bruto = (process.env.TRUSTED_PROXY_HOPS ?? "").trim();
  if (!bruto) return 1;
  const n = Number.parseInt(bruto, 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

/**
 * Forma canonica de una IP, o `null` si no lo es.
 *
 * Canonizar importa para el limite: `::ffff:1.2.3.4` y `1.2.3.4` son el mismo
 * origen, y sin normalizar serian DOS cubos para un solo cliente — es decir, el
 * doble de cupo por escribir la misma IP de otra forma.
 */
function normalizaIp(bruto: string): string | null {
  let ip = bruto.trim();
  if (!ip) return null;

  // `[::1]:443` -> `::1`
  if (ip.startsWith("[") && ip.includes("]")) ip = ip.slice(1, ip.indexOf("]"));

  // IPv4 mapeada en IPv6: `::ffff:1.2.3.4` es 1.2.3.4.
  const mapeada = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapeada?.[1]) ip = mapeada[1];

  const esIpv4 = (v: string) =>
    /^\d{1,3}(\.\d{1,3}){3}$/.test(v)
    && v.split(".").every((o) => o.length <= 3 && Number(o) <= 255);

  if (esIpv4(ip)) return ip.split(".").map((o) => String(Number(o))).join(".");

  // `1.2.3.4:5678` -> `1.2.3.4` (solo IPv4: en IPv6 los `:` son parte de la IP)
  if ((ip.match(/:/g)?.length ?? 0) === 1) {
    const host = ip.split(":", 1)[0] ?? "";
    if (esIpv4(host)) return host.split(".").map((o) => String(Number(o))).join(".");
  }

  // IPv6: se acepta la forma que sea, en minusculas para que sea una sola clave.
  if (/^[0-9a-f:]+$/i.test(ip) && ip.includes(":")) return ip.toLowerCase();
  return null;
}

/**
 * El origen de red que sirve como CLAVE del cubo de limite.
 *
 * `X-Forwarded-For` se lee de DERECHA a izquierda. El ultimo valor lo escribe el
 * proxy mas cercano al servidor y el cliente no puede falsearlo; los primeros
 * los pone quien quiera. Leyendo el primero —como se hacia antes— bastaba con
 *
 *     X-Forwarded-For: <algo distinto en cada peticion>
 *
 * para estrenar cubo cada vez y quedarse sin limite, sin necesidad de esquivar
 * el middleware: se ejecutaba, contaba, y contaba en otro sitio cada vez.
 *
 * Un identificador que elige quien es limitado no puede formar parte de la clave
 * que lo limita. Mismo criterio que `identidad_peticion.py::ip_del_cliente` y
 * que la retirada de `X-Workspace-Id` de la clave en el limitador de FastAPI.
 */
export function getClientIp(request: NextRequest): string {
  const reenviada = request.headers.get("x-forwarded-for");
  if (reenviada) {
    const partes = reenviada.split(",").map((p) => p.trim()).filter(Boolean);
    if (partes.length > 0) {
      const saltos = Math.max(1, saltosDeProxyConfiables());
      const indice = Math.max(0, partes.length - saltos);
      const candidata = normalizaIp(partes[indice] ?? "")
        ?? normalizaIp(partes[partes.length - 1] ?? "");
      // Si nada de la cabecera es una IP de verdad se IGNORA y se sigue abajo:
      // usar la basura tal cual la convertiria en una clave elegible, que es
      // justo el problema que esto arregla.
      if (candidata) return candidata;
    }
  }

  // Solo si no hubo XFF utilizable. Las escribe el borde, no el cliente.
  for (const cabecera of ["cf-connecting-ip", "x-real-ip"]) {
    const valor = normalizaIp(request.headers.get(cabecera) ?? "");
    if (valor) return valor;
  }
  return "unknown";
}

/**
 * Whether critical auth/webhook rules must fail-closed without Upstash.
 *
 * Staging Railway runs `NODE_ENV=production` but `RAILWAY_ENVIRONMENT=staging`.
 * Treating staging as "strict prod" permanently 429s password login when Upstash
 * is absent — blocks certification without adding paid Redis. Production and
 * unknown production-like hosts remain fail-closed.
 */
export function isCriticalRateLimitStrictEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.NODE_ENV !== "production") return false;

  const explicit = (env.NELVYON_DEPLOY_ENV ?? "").trim().toLowerCase();
  if (
    explicit === "staging" ||
    explicit === "development" ||
    explicit === "dev" ||
    explicit === "test"
  ) {
    return false;
  }
  if (explicit === "production" || explicit === "prod") return true;

  const railway = (
    env.RAILWAY_ENVIRONMENT_NAME ??
    env.RAILWAY_ENVIRONMENT ??
    ""
  )
    .trim()
    .toLowerCase();
  if (
    railway === "staging" ||
    railway === "preview" ||
    railway === "development" ||
    railway === "dev"
  ) {
    return false;
  }
  if (railway === "production" || railway === "prod") return true;

  // Bare NODE_ENV=production with no staging markers — keep fail-closed.
  return true;
}

function getUpstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_TOKEN;
  if (!url?.trim() || !token?.trim()) return null;
  return { url: url.replace(/\/$/, ""), token: token.trim() };
}

async function upstashIncrWithExpire(
  baseUrl: string,
  token: string,
  key: string,
  windowSec: number,
): Promise<number> {
  // `INCR` y `EXPIRE` van en UNA sola llamada.
  //
  // Antes eran dos peticiones y la segunda no comprobaba `.ok` ni tenia
  // `.catch`. Si fallaba —corte de red, 500 de Upstash, el proceso reciclado
  // justo en medio— la clave se quedaba SIN CADUCIDAD, y una clave de ventana
  // fija sin caducidad no vuelve a cero jamas: cada peticion la incrementa, el
  // contador pasa el techo y esa IP recibe 429 de forma PERMANENTE para esa
  // regla. En las reglas de autenticacion eso es un cliente que no puede volver
  // a entrar, y desde fuera se ve igual que un limite funcionando bien.
  //
  // `NX` importa: pone la caducidad solo si no habia. Refrescarla en cada
  // peticion convertiria la ventana fija en una deslizante que nunca termina,
  // asi que quien siguiera llamando no se desbloquearia nunca.
  const res = await fetch(`${baseUrl}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSec), "NX"],
    ]),
  });
  if (!res.ok) {
    throw new Error(`Upstash pipeline failed: ${res.status}`);
  }
  const cuerpo = (await res.json()) as Array<{ result?: number; error?: string }>;
  if (!Array.isArray(cuerpo) || cuerpo.length < 2) {
    throw new Error("Upstash pipeline: respuesta inesperada");
  }
  // Si el INCR conto pero el EXPIRE fallo, se aborta: mejor caer al respaldo
  // —o cerrar, segun la regla— que seguir con una ventana que no caduca.
  if (cuerpo[1]?.error) {
    throw new Error(`Upstash EXPIRE failed: ${cuerpo[1].error}`);
  }
  return typeof cuerpo[0]?.result === "number" ? cuerpo[0].result : 0;
}

/**
 * Fixed-window rate limit per IP.
 * Uses Upstash when configured; only non-critical routes (and staging) may fall back to per-instance memory.
 * Production critical routes without Upstash remain fail-closed.
 */
/**
 * Desactivacion del limitador SOLO para la suite E2E.
 *
 * Los 349 tests de Playwright corren contra un unico servidor desde una sola IP
 * (127.0.0.1) con varios workers en menos de dos minutos, asi que cruzan
 * inevitablemente el umbral de reglas como `public-api` (30 peticiones/minuto).
 * El servidor entonces corta conexiones —`ECONNRESET`— y falla el test que
 * casualmente cruce el limite, que cambia en cada ejecucion: ese era el origen
 * del flaky rotatorio.
 *
 * Dos condiciones DEBEN cumplirse para omitir el limitador, y la de produccion
 * es la que manda: en `NODE_ENV=production` la variable no desactiva nada, pase
 * lo que pase. No se eximen IPs, no se tocan reglas, limites ni ventanas, y los
 * valores por defecto quedan igual: sin la variable, el comportamiento es
 * exactamente el de antes.
 */
export function isRateLimitDisabledForTests(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.RATE_LIMIT_DISABLED === "1";
}

export async function checkIpRateLimit(params: {
  ip: string;
  rule: RateLimitRule;
}): Promise<RateLimitResult> {
  if (isRateLimitDisabledForTests()) {
    return { allowed: true, retryAfter: 0 };
  }

  const memoryKey = `${params.rule.id}:${params.ip}`;
  const failClosed = (): RateLimitResult => ({
    allowed: false,
    retryAfter: params.rule.windowSec,
  });
  const memoryFallback = (): RateLimitResult =>
    checkInMemoryRateLimit({
      key: memoryKey,
      limit: params.rule.limit,
      windowSec: params.rule.windowSec,
    });

  const config = getUpstashConfig();
  const strict = isCriticalRateLimitStrictEnvironment();
  if (!config) {
    if (strict && params.rule.requireSharedStoreInProduction) {
      console.error("[rate-limit] Upstash required for critical production rule", {
        rule: params.rule.id,
      });
      return failClosed();
    }
    if (process.env.NODE_ENV === "production") {
      console.warn("[rate-limit] Upstash not configured — using in-memory fallback", {
        rule: params.rule.id,
        strict,
      });
    }
    return memoryFallback();
  }

  const key = `ratelimit:${params.rule.id}:${params.ip}`;

  try {
    const count = await upstashIncrWithExpire(config.url, config.token, key, params.rule.windowSec);
    if (count > params.rule.limit) {
      return { allowed: false, retryAfter: params.rule.windowSec };
    }
    return { allowed: true, retryAfter: params.rule.windowSec };
  } catch (err) {
    if (strict && params.rule.requireSharedStoreInProduction) {
      console.error("[rate-limit] Upstash error on critical production rule", {
        rule: params.rule.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return failClosed();
    }
    console.warn("[rate-limit] Upstash error — in-memory fallback", {
      rule: params.rule.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return memoryFallback();
  }
}
