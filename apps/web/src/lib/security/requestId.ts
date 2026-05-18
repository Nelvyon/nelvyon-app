import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const REQUEST_ID_HEADER = "x-request-id";
const CORRELATION_ID_HEADER = "x-correlation-id";

/** Reuse inbound correlation / request id when present (MIG 289), else generate. */
export function resolveRequestId(request: NextRequest): string {
  const existing =
    request.headers.get(REQUEST_ID_HEADER)?.trim() ||
    request.headers.get(CORRELATION_ID_HEADER)?.trim();
  if (existing && existing.length > 0) return existing;
  return crypto.randomUUID();
}

export function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}
