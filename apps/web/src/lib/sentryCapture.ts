import * as Sentry from "@sentry/nextjs";

import type { ErrorCode } from "@/types/errors";

/** Captures API errors when Sentry is configured (NEXT_PUBLIC_SENTRY_DSN). */
export function captureUnknownApiError(err: unknown, errorCode: ErrorCode): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    return;
  }
  try {
    Sentry.captureException(err, { tags: { errorCode } });
  } catch {
    /* Sentry unavailable — ignore */
  }
}
