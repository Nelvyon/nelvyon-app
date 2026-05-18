import type { ErrorCode } from "@/types/errors";

/** Sentry disabled for Railway build — no-op until re-enabled. */
export function captureUnknownApiError(_err: unknown, _errorCode: ErrorCode): void {
  // intentionally empty
}
