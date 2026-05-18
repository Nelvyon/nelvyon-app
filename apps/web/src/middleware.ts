import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "../i18n";
import { checkIpRateLimit, getClientIp, getRateLimitRule } from "./lib/security/rateLimit";
import { resolveRequestId, withRequestId } from "./lib/security/requestId";
import { createRequestLogger } from "@/lib/serverLogger";

const handleI18n = createMiddleware(routing);

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/os/") ||
    pathname === "/os" ||
    pathname.startsWith("/api/os/") ||
    pathname.startsWith("/saas/") ||
    pathname === "/saas" ||
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
  const requestId = resolveRequestId(request);
  const pathname = request.nextUrl.pathname;
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
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return end(NextResponse.redirect(url));
    }
    if (pathname.startsWith("/api/")) {
      return end(NextResponse.next());
    }
  }

  return end(handleI18n(request));
}

export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/public/:path*",
    "/os/:path*",
    "/api/os/:path*",
    "/saas/:path*",
    "/api/saas/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
