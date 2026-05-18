const isDev = process.env.NODE_ENV !== "production";

export type LogMeta = Record<string, unknown>;

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta, cause?: Error): void;
}

const FORBIDDEN_KEYS = new Set(["password", "token", "secret", "authorization", "cookie"]);

export function sanitizeMeta(meta: LogMeta | undefined): LogMeta {
  if (!meta) return {};
  const out: LogMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) continue;
    if (value instanceof Error) {
      out[key] = { name: value.name, message: value.message };
      continue;
    }
    out[key] = value;
  }
  return out;
}

function write(level: string, message: string, meta?: LogMeta, context?: string, cause?: Error): void {
  const payload = sanitizeMeta(meta);
  if (cause) payload.cause = { name: cause.name, message: cause.message };
  const prefix = context ? `[${context}] ` : "";
  const suffix = Object.keys(payload).length > 0 ? ` ${JSON.stringify(payload)}` : "";
  const line = `${prefix}${message}${suffix}`;

  if (level === "error") {
    console.error(`[${level}]`, line);
    return;
  }
  if (level === "warn") {
    if (isDev) console.warn(`[${level}]`, line);
    return;
  }
  if (isDev) console.log(`[${level}]`, line);
}

function makeLogger(context?: string, baseMeta?: LogMeta): Logger {
  const ctx = context?.trim() || undefined;
  const base = baseMeta ?? {};
  const withBase = (meta?: LogMeta): LogMeta => ({ ...base, ...meta });

  return {
    debug(message, meta) {
      write("debug", message, withBase(meta), ctx);
    },
    info(message, meta) {
      write("info", message, withBase(meta), ctx);
    },
    warn(message, meta) {
      write("warn", message, withBase(meta), ctx);
    },
    error(message, meta, cause) {
      write("error", message, withBase(meta), ctx, cause);
    },
  };
}

export function createLogger(context?: string): Logger {
  return makeLogger(context);
}

export const logger = createLogger();

export function createRequestLogger(requestId: string, userId?: string): Logger {
  const base: LogMeta = { requestId };
  if (userId !== undefined && userId !== "") base.userId = userId;
  return makeLogger(undefined, base);
}

export const serverLogger = {
  info: (...args: unknown[]) => isDev && console.log(...args),
  error: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => isDev && console.warn(...args),
};
