import { NextRequest, NextResponse } from "next/server";

import { checkIpRateLimit, getClientIp, getRateLimitRule } from "./lib/security/rateLimit";
import { resolveRequestId, withRequestId } from "./lib/security/requestId";
import { createRequestLogger } from "@/lib/serverLogger";
import {
  encodeWhitelabelHeader,
  fetchWhitelabelByHost,
  isDefaultWhitelabelHost,
  normalizeHost,
} from "@/core/whitelabel/resolveWhitelabel";

/** Legacy SaaS API stubs that return 410 Gone without auth — must not be blocked by middleware. */
const SAAS_LEGACY_GONE = new Set([
  "/api/saas/certificados",
  "/api/saas/encuestas",
  "/api/saas/comunidades",
  "/api/saas/documentos",
  "/api/saas/objects",
  "/api/saas/productos",
  "/api/saas/qr",
]);

/** SaaS API routes that must work without session (install-time manifest, etc.). */
const SAAS_PUBLIC_API = new Set(["/api/saas/pwa/manifest"]);

function isProtectedPath(pathname: string): boolean {
  if (SAAS_LEGACY_GONE.has(pathname)) return false;
  if (SAAS_PUBLIC_API.has(pathname)) return false;
  // /saas (exact) = public marketing landing; all other /saas/* routes require auth
  if (pathname === "/saas" || pathname === "/saas/") return false;
  if (pathname.startsWith("/saas/")) return true;
  return (
    pathname.startsWith("/os/") ||
    pathname === "/os" ||
    pathname.startsWith("/api/os/") ||
    pathname.startsWith("/api/saas/") ||
    pathname.startsWith("/admin/") ||
    pathname === "/admin" ||
    pathname.startsWith("/api/admin/")
  );
}

function shouldSkipRequestLog(pathname: string): boolean {
  if (pathname === "/api/health/live" || pathname === "/api/health/ready") return true;
  if (pathname.startsWith("/_next/")) return true;
  return false;
}

const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function trackAffiliateRef(request: NextRequest, refCode: string): void {
  const origin = request.nextUrl.origin;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) headers["x-forwarded-for"] = forwarded;
  const ua = request.headers.get("user-agent");
  if (ua) headers["user-agent"] = ua;
  const referer = request.headers.get("referer");
  if (referer) headers["referer"] = referer;

  void fetch(`${origin}/api/affiliates/click`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code: refCode }),
  }).catch(() => {});
}

function applyAffiliateRefCookie(request: NextRequest, response: NextResponse): NextResponse {
  const rawRef = request.nextUrl.searchParams.get("ref")?.trim();
  if (!rawRef) return response;
  const refCode = rawRef.toUpperCase();
  trackAffiliateRef(request, refCode);
  response.cookies.set("nelvyon_ref", refCode, {
    maxAge: REF_COOKIE_MAX_AGE,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/health/")) {
    return NextResponse.next();
  }

  const requestId = resolveRequestId(request);
  const startedAt = Date.now();
  const method = request.method;
  const path = pathname;
  const ip = getClientIp(request);
  const requestLogger = createRequestLogger(requestId);

  if (!shouldSkipRequestLog(pathname)) {
    requestLogger.info("request_start", { method, path, requestId, ip });
  }

  function end(res: NextResponse): NextResponse {
    if (!shouldSkipRequestLog(pathname)) {
      requestLogger.info("request_end", {
        method,
        path,
        requestId,
        statusCode: res.status,
        durationMs: Date.now() - startedAt,
      });
    }
    return applyAffiliateRefCookie(request, withRequestId(res, requestId));
  }

  const rateRule = getRateLimitRule(pathname);
  if (rateRule) {
    const rateIp = getClientIp(request);
    const rate = await checkIpRateLimit({ ip: rateIp, rule: rateRule });
    if (!rate.allowed) {
      return end(
        NextResponse.json(
          { error: "Too many requests", retryAfter: rate.retryAfter },
          { status: 429 },
        ),
      );
    }
  }

  if (isProtectedPath(pathname)) {
    const token = request.cookies.get("nelvyon_token")?.value;
    if (!token || token.length === 0) {
      if (pathname.startsWith("/api/")) {
        return end(NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }));
      }
      const next = `${pathname}${request.nextUrl.search}`;
      const url = new URL("/login", request.nextUrl.origin);
      url.searchParams.set("next", next);
      return end(NextResponse.redirect(url));
    }
    if (pathname.startsWith("/api/")) {
      return end(NextResponse.next());
    }
  }

  const host = normalizeHost(request.headers.get("host") ?? request.nextUrl.host);
  let whitelabelHeader: string | undefined;
  if (!isDefaultWhitelabelHost(host)) {
    const wl = await fetchWhitelabelByHost(host);
    if (wl) {
      whitelabelHeader = encodeWhitelabelHeader(wl);
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (whitelabelHeader) {
    requestHeaders.set("x-nelvyon-whitelabel", whitelabelHeader);
  }

  // Locale is handled via LocaleProvider + next-intl plugin (no [locale] segment). Skip next-intl middleware rewrites.
  return end(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
  );
}

export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/public/:path*",
    "/api/webhooks/:path*",
    "/api/early-adopter/:path*",
    "/os/:path*",
    "/api/os/:path*",
    "/saas/:path*",
    "/api/saas/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|api/health|api|_next|_vercel|.*\\..*).*)",
  ],
};
