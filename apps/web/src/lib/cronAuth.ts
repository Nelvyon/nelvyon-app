import crypto from "node:crypto";
import { NextResponse } from "next/server";

function timingSafeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

/** Exported for webhook/HMAC comparisons outside cron routes. */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  return timingSafeEqual(a, b);
}

function expectedCronSecret(): string {
  return process.env.CRON_SECRET?.trim() ?? "";
}

/** Validates `x-cron-secret` header against CRON_SECRET (timing-safe). */
export function verifyCronHeader(headerValue: string | null | undefined): NextResponse | null {
  const expected = expectedCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const provided = headerValue ?? "";
  if (!timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Validates `Authorization: Bearer <CRON_SECRET>` (timing-safe on token). */
export function verifyCronBearer(authHeader: string | null | undefined): NextResponse | null {
  const expected = expectedCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = authHeader ?? "";
  const provided = raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw.trim();
  if (!timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Accepts x-cron-secret or Bearer token (workflow-date compatibility). */
export function verifyCronFlexible(
  headerSecret: string | null | undefined,
  bearerHeader: string | null | undefined,
): NextResponse | null {
  const expected = expectedCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const fromHeader = headerSecret ?? "";
  const fromBearer = bearerHeader?.startsWith("Bearer ")
    ? bearerHeader.slice(7).trim()
    : (bearerHeader ?? "").trim();
  const provided = fromHeader || fromBearer;
  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
