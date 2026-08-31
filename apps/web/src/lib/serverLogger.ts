import { redactar } from "@/../../backend/seguridad/loQueNoSeImprime.mjs";

const isDev = process.env.NODE_ENV !== "production";

export type LogMeta = Record<string, unknown>;

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta, cause?: Error): void;
}

/**
 * ESTA COPIA TENIA CUATRO AGUJEROS, uno mas que su gemela del backend.
 *
 *   1. el nombre se comparaba entero contra cinco palabras, asi que
 *      `accessToken`, `apiKey`, `client_secret` o `set-cookie` pasaban;
 *   2. los valores no se miraban: un secreto bajo un nombre inocente salia;
 *   3. los arrays no se recorrian;
 *   4. y ESTA ademas no recorria los objetos anidados, asi que
 *      `{ headers: { authorization: "Bearer ..." } }` salia entero.
 *
 * Se usa el saneador comun. Tener dos copias del mismo filtro con dos conjuntos
 * de agujeros distintos era el problema de fondo.
 *
 * SE IMPORTA Y SE REEXPORTA EN DOS PASOS, y no con `export { x } from`.
 *
 * Esa forma NO crea un enlace local: reexporta el nombre hacia fuera y dentro
 * de este fichero `sanitizeMeta` sigue sin existir. `write()` la llama, asi que
 * habria reventado en ejecucion con «sanitizeMeta is not defined» — y en un
 * registrador, es decir, justo cuando algo ya estaba yendo mal.
 *
 * Las pruebas de este fichero pasaban igual, porque no ejercitan `write`. Lo
 * caza el comprobador de tipos, que es exactamente para lo que esta.
 */
import { sanitizeMeta } from "@/../../backend/logger/sanearParaElRegistro";

export { sanitizeMeta };

function write(level: string, message: string, meta?: LogMeta, context?: string, cause?: Error): void {
  const payload = sanitizeMeta(meta);
  // El mensaje tambien se redacta: interpolar el dato en la frase es la forma
  // natural de escribir un log, y era por donde salia casi todo.
  const mensajeSeguro = redactar(message);
  if (cause) payload.cause = { name: cause.name, message: redactar(cause.message) };
  const prefix = context ? `[${context}] ` : "";
  const suffix = Object.keys(payload).length > 0 ? ` ${JSON.stringify(payload)}` : "";
  const line = `${prefix}${mensajeSeguro}${suffix}`;

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
