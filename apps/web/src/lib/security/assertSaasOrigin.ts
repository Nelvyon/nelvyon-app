/**
 * Origin allowlist for cookie-authenticated mutating SaaS API requests (CSRF defense-in-depth).
 * SameSite=strict already mitigates classic CSRF; this catches mismatched Origin when cookie is present.
 */

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutatingMethod(method: string): boolean {
  return MUTATING.has(method.toUpperCase());
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
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const out = new Set<string>(fromEnv);
  // Local dev defaults
  out.add("http://localhost:3000");
  out.add("http://127.0.0.1:3000");
  return [...out];
}

export function originAllowed(origin: string | null, allowlist: string[] = allowedSaasOrigins()): boolean {
  if (!origin) return false;
  const normalized = origin.trim().replace(/\/$/, "");
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
}): "csrf_origin_required" | "csrf_origin_mismatch" | null {
  if (!opts.pathname.startsWith("/api/saas/") && !opts.pathname.startsWith("/api/os/")) return null;
  if (!isMutatingMethod(opts.method)) return null;
  if (!opts.hasAuthCookie) return null;
  if (opts.hasAuthorizationHeader) return null;

  const allow = allowedSaasOrigins();
  if (opts.origin) {
    return originAllowed(opts.origin, allow) ? null : "csrf_origin_mismatch";
  }
  // Some browsers omit Origin on same-site; accept Referer if host matches allowlist origin
  if (opts.referer) {
    try {
      const refOrigin = new URL(opts.referer).origin;
      return originAllowed(refOrigin, allow) ? null : "csrf_origin_mismatch";
    } catch {
      return "csrf_origin_mismatch";
    }
  }
  return "csrf_origin_required";
}
