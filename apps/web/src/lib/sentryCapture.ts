import * as Sentry from "@sentry/nextjs";

import type { ErrorCode } from "@/types/errors";

/** Captura en Sentry solo errores no mapeados (producción). */
export function captureUnknownApiError(err: unknown, errorCode: ErrorCode): void {
  if (errorCode !== "UNKNOWN_ERROR") return;
  if (process.env.NODE_ENV !== "production") return;
  Sentry.captureException(err);
}
