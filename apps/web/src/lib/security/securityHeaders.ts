import type { NextResponse } from "next/server";
import { SECURITY_HEADERS_WITHOUT_CSP } from "./headers";

/**
 * Apply baseline security headers on middleware responses.
 * Must match next.config (SSOT: headers.ts) — especially X-Frame-Options=SAMEORIGIN.
 */
export function applySecurityHeaders(
  res: NextResponse,
  isProd = process.env.NODE_ENV === "production",
): NextResponse {
  for (const h of SECURITY_HEADERS_WITHOUT_CSP) {
    if (h.key === "Strict-Transport-Security" && !isProd) continue;
    res.headers.set(h.key, h.value);
  }
  return res;
}
