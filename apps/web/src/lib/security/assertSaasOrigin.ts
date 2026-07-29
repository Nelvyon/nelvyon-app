/**
 * Origin allowlist for cookie-authenticated mutating SaaS API requests (CSRF defense-in-depth).
 * SameSite=strict already mitigates classic CSRF; this catches mismatched Origin when cookie is present.
 */

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutatingMethod(method: string): boolean {
  return MUTATING.has(method.toUpperCase());
}

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function originFromPublicHost(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return normalizeOrigin(trimmed);
  return normalizeOrigin(`https://${trimmed}`);
}

/** Hosts derived from NEXT_PUBLIC_APP_URL / NEXTAUTH_URL / explicit allowlist. */
export function allowedSaasOrigins(): string[] {
  const raw = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.NELVYON_CSRF_ALLOWED_ORIGINS,
  ]
    .filter(Boolean)
    .join(",");
  const fromEnv = raw
    .split(",")
    .map((s) => normalizeOrigin(s))
    .filter(Boolean);
  const out = new Set<string>(fromEnv);
  // Local dev defaults
  out.add("http://localhost:3000");
  out.add("http://127.0.0.1:3000");
  // Production brand hosts (app custom domain + apex) — safe CSRF allowlist anchors
  out.add("https://nelvyon.com");
  out.add("https://app.nelvyon.com");
  // Railway public host for the current deployment (staging/custom domains)
  const railwayOrigin =
    originFromPublicHost(process.env.RAILWAY_PUBLIC_DOMAIN) ||
    originFromPublicHost(process.env.RAILWAY_STATIC_URL);
  if (railwayOrigin) out.add(railwayOrigin);
  // Known Railway staging web service (ideal-victory)
  out.add("https://ideal-victory-staging.up.railway.app");
  return [...out];
}

export function originAllowed(origin: string | null, allowlist: string[] = allowedSaasOrigins()): boolean {
  if (!origin) return false;
  const normalized = normalizeOrigin(origin);
  return allowlist.some((a) => a === normalized);
}

/**
 * Cookie-session mutating /api/saas/* must present a matching Origin (or Referer host match).
 * Returns null when OK; otherwise a short error code.
 */
export function assertSaasCookieMutationOrigin(opts: {
  method: string;
  pathname: string;
  origin: string | null;
  referer: string | null;
  hasAuthCookie: boolean;
  /** Bearer / API-key style — skip Origin (not cookie CSRF). */
  hasAuthorizationHeader: boolean;
  /** Deployment origin of this request (same-origin always allowed). */
  requestOrigin?: string | null;
}): "csrf_origin_required" | "csrf_origin_mismatch" | null {
  if (!opts.pathname.startsWith("/api/saas/") && !opts.pathname.startsWith("/api/os/")) return null;
  if (!isMutatingMethod(opts.method)) return null;
  if (!opts.hasAuthCookie) return null;
  if (opts.hasAuthorizationHeader) return null;

  const allow = allowedSaasOrigins();
  const requestOrigin = opts.requestOrigin ? normalizeOrigin(opts.requestOrigin) : null;
  if (opts.origin) {
    const normalized = normalizeOrigin(opts.origin);
    if (requestOrigin && normalized === requestOrigin) return null;
    return originAllowed(normalized, allow) ? null : "csrf_origin_mismatch";
  }
  // Some browsers omit Origin on same-site; accept Referer if host matches allowlist origin
  if (opts.referer) {
    try {
      const refOrigin = normalizeOrigin(new URL(opts.referer).origin);
      if (requestOrigin && refOrigin === requestOrigin) return null;
      return originAllowed(refOrigin, allow) ? null : "csrf_origin_mismatch";
    } catch {
      return "csrf_origin_mismatch";
    }
  }
  return "csrf_origin_required";
}
