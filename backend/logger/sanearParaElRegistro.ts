/**
 * Dejar un objeto de registro en algo que se puede imprimir sin miedo.
 *
 * ESTABA ESCRITO DOS VECES, con los mismos tres agujeros en las dos copias:
 * `backend/logger/logger.ts` y `apps/web/src/lib/serverLogger.ts`. Y no eran
 * copias identicas — la del lado web ademas NO recorria los objetos anidados,
 * asi que `{ headers: { authorization: "Bearer ..." } }` salia entero.
 *
 * Vive aparte del registrador para que el lado web pueda usarlo sin arrastrar
 * `@sentry/nextjs`, que es lo que impedia compartirlo.
 *
 * COSTE EXTERNO: 0 EUR.
 */
// Del modulo PURO, no de `loQueNoSeImprime.mjs`: aquel importa `node:crypto` y
// esto entra en el grafo del navegador a traves de `serverLogger`.
import { esNombreSensible, redactar } from "../seguridad/formaDeUnSecreto.mjs";

export type LogMeta = Record<string, unknown>;

/**
 * ── POR QUE ESTA LISTA YA NO DECIDE SOLA ────────────────────────────────────
 *
 * Era esto y nada mas:
 *
 *     FORBIDDEN_KEYS.has(key.toLowerCase())
 *
 * Coincidencia EXACTA sobre cinco nombres. Es decir, `authorization` se
 * quitaba... y `accessToken`, `refreshToken`, `apiKey`, `client_secret`,
 * `set-cookie` y `databaseUrl` no, porque ninguno es exactamente una de las
 * cinco palabras.
 *
 * Se conserva la lista —es rapida y cubre los cinco de siempre— pero la
 * decision la comparte ahora con `esNombreSensible`, que reconoce la FORMA del
 * nombre y no solo el nombre entero.
 */
const FORBIDDEN_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
]);

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEYS.has(key.toLowerCase()) || esNombreSensible(key);
}

/**
 * Quita lo que no debe salir y normaliza el resto.
 *
 * ── TRES AGUJEROS QUE TENIA ─────────────────────────────────────────────────
 *
 * 1. LOS ARRAYS NO SE RECORRIAN. La condicion era
 *
 *        typeof value === "object" && !Array.isArray(value)
 *
 *    asi que un array se copiaba tal cual. `{ headers: [["authorization",
 *    "Bearer ..."]] }` salia entero, y un array de objetos con claves
 *    sensibles tambien.
 *
 * 2. EL NOMBRE SE COMPARABA ENTERO. Ver el comentario de `FORBIDDEN_KEYS`.
 *
 * 3. LOS VALORES NO SE MIRABAN. Un secreto guardado bajo un nombre inocente
 *    —`dato`, `valor`, `config`— salia intacto. Ahora toda cadena pasa por
 *    `redactar`, que reconoce la forma: claves `sk-`/`rk_`, cadenas de
 *    conexion con credenciales, cabeceras Bearer, JWT.
 *
 * El nombre y la forma deciden por separado a proposito: cualquiera de los dos
 * basta para tapar, y hacen falta los dos para dejar pasar.
 */
export function sanitizeMeta(meta: LogMeta | undefined): LogMeta {
  if (!meta) return {};
  const out: LogMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (isForbiddenKey(key)) continue;
    out[key] = sanitizeValue(value);
  }
  return out;
}

/** Un valor cualquiera, dejado en algo que se puede imprimir sin miedo. */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return redactar(value);
  if (value instanceof Error) {
    // El mensaje de un error tambien es texto del que no se sabe el origen: un
    // error de proveedor puede echar de vuelta la peticion con sus cabeceras.
    return { name: value.name, message: redactar(value.message) };
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return sanitizeMeta(value as LogMeta);
  }
  return value;
}
