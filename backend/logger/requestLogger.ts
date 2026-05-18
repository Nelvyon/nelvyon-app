import { createLogger, type Logger } from "./logger";

/**
 * Logger scoped to a single HTTP request (and optional authenticated user).
 */
export function createRequestLogger(requestId: string, userId?: string): Logger {
  const base: Record<string, unknown> = { requestId };
  if (userId !== undefined && userId !== "") base.userId = userId;
  const inner = createLogger();
  return {
    debug(message, meta) {
      inner.debug(message, { ...base, ...meta });
    },
    info(message, meta) {
      inner.info(message, { ...base, ...meta });
    },
    warn(message, meta) {
      inner.warn(message, { ...base, ...meta });
    },
    error(message, meta, cause) {
      inner.error(message, { ...base, ...meta }, cause);
    },
  };
}
