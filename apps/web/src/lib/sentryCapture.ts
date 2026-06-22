import * as Sentry from "@sentry/nextjs";

import type { ErrorCode } from "@/types/errors";

export function captureUnknownApiError(err: unknown, errorCode: ErrorCode): void {
  Sentry.withScope((scope) => {
    scope.setTag("errorCode", errorCode);
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
  });
}
