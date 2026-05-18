import * as Sentry from "@sentry/nextjs";

export type LogMeta = Record<string, unknown>;

const FORBIDDEN_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
]);

type LogLevelName = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevelName, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function parseLogLevel(): LogLevelName {
  const raw = process.env.LOG_LEVEL?.toLowerCase().trim();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function isProductionJson(): boolean {
  return process.env.NODE_ENV === "production";
}

function allowDebug(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.LOG_LEVEL === "debug";
}

function meetsMinLevel(level: LogLevelName): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[parseLogLevel()];
}

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEYS.has(key.toLowerCase());
}

/** Strip sensitive keys and normalize values for safe logging. */
export function sanitizeMeta(meta: LogMeta | undefined): LogMeta {
  if (!meta) return {};
  const out: LogMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (isForbiddenKey(key)) continue;
    if (value instanceof Error) {
      out[key] = { name: value.name, message: value.message };
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      out[key] = sanitizeMeta(value as LogMeta);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function findErrorForSentry(meta: LogMeta | undefined, cause: Error | undefined): Error | undefined {
  if (cause) return cause;
  if (!meta) return undefined;
  for (const v of Object.values(meta)) {
    if (v instanceof Error) return v;
  }
  return undefined;
}

function writeJsonLine(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload));
}

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

function levelColor(level: LogLevelName): string {
  switch (level) {
    case "debug":
      return ANSI.gray;
    case "info":
      return ANSI.green;
    case "warn":
      return ANSI.yellow;
    case "error":
      return ANSI.red;
    default:
      return ANSI.reset;
  }
}

function writeDevLine(
  level: LogLevelName,
  message: string,
  context: string | undefined,
  merged: LogMeta,
): void {
  const ts = new Date().toISOString();
  const ctx = context ? `${ANSI.cyan}[${context}]${ANSI.reset} ` : "";
  const metaKeys = Object.keys(merged);
  const metaStr =
    metaKeys.length > 0 ? ` ${ANSI.dim}${JSON.stringify(merged)}${ANSI.reset}` : "";
  const line = `${ANSI.dim}${ts}${ANSI.reset} ${levelColor(level)}${level.toUpperCase()}${ANSI.reset} ${ctx}${message}${metaStr}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta, cause?: Error): void;
}

function emit(
  level: LogLevelName,
  message: string,
  context: string | undefined,
  baseMeta: LogMeta | undefined,
  meta: LogMeta | undefined,
  cause: Error | undefined,
): void {
  if (level === "debug") {
    if (!allowDebug() || !meetsMinLevel("debug")) return;
  } else if (level === "info") {
    if (!meetsMinLevel("info")) return;
  }
  /* warn + error always emit when called */

  const merged: LogMeta = { ...sanitizeMeta(baseMeta), ...sanitizeMeta(meta) };
  const forSentry = findErrorForSentry(meta, cause) ?? findErrorForSentry(baseMeta, undefined);

  if (level === "error" && forSentry) {
    Sentry.captureException(forSentry);
  }

  const timestamp = new Date().toISOString();

  if (isProductionJson()) {
    const payload: Record<string, unknown> = {
      level,
      timestamp,
      message,
      ...merged,
    };
    if (context) payload.context = context;
    writeJsonLine(payload);
    return;
  }

  writeDevLine(level, message, context, merged);
}

export function createLogger(context?: string): Logger {
  const ctxLabel = context?.trim() ? context.trim() : undefined;
  return {
    debug(message, meta) {
      emit("debug", message, ctxLabel, undefined, meta, undefined);
    },
    info(message, meta) {
      emit("info", message, ctxLabel, undefined, meta, undefined);
    },
    warn(message, meta) {
      emit("warn", message, ctxLabel, undefined, meta, undefined);
    },
    error(message, meta, cause) {
      emit("error", message, ctxLabel, undefined, meta, cause);
    },
  };
}

export const logger = createLogger();
