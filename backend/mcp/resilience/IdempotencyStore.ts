/**
 * Idempotencia de las herramientas MCP.
 *
 * Dos piezas con responsabilidades distintas, y conviene no confundirlas:
 *
 *   - `reclamarEjecucionMcp` — la GARANTIA. Vive en PostgreSQL, sobrevive a
 *     reinicios y vale entre instancias. Es lo que impide que la misma clave
 *     ejecute una herramienta dos veces.
 *   - `getIdempotentResult` / `putIdempotentResult` — una COMODIDAD. Un cache
 *     en memoria del resultado, para poder devolver la respuesta exacta de la
 *     primera vez. Se pierde al reiniciar, y perderlo no rompe nada: sin el,
 *     un duplicado sigue sin ejecutarse, solo que responde «duplicado» en vez
 *     de repetir la respuesta original.
 *
 * Antes solo estaba la segunda, y hacia de primera. Su propia cabecera lo
 * admitia: «survives within process». Con dos instancias cada una tiene su Map,
 * asi que la misma clave llega a la que no la ha visto y la herramienta se
 * ejecuta otra vez; y un reinicio deja el Map vacio, de modo que el reintento
 * del cliente ante un timeout —lo normal— vuelve a ejecutar.
 *
 * Es el mismo defecto que el Bloque 4 corrigio en los webhooks entrantes:
 * «idempotente dentro de un proceso» no es idempotente, porque quien reintenta
 * lo hace contra el balanceador y no contra un proceso concreto.
 */

import type { McpInvokeResult } from "../types";

type Entry = { result: McpInvokeResult; expiresAt: number };

const store = new Map<string, Entry>();
const TTL_MS = 15 * 60_000;

function key(tenantId: string, idempotencyKey: string): string {
  return `${tenantId}::${idempotencyKey}`;
}

export function getIdempotentResult(
  tenantId: string,
  idempotencyKey: string,
): McpInvokeResult | null {
  const e = store.get(key(tenantId, idempotencyKey));
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    store.delete(key(tenantId, idempotencyKey));
    return null;
  }
  return { ...e.result, idempotentReplay: true };
}

export function putIdempotentResult(
  tenantId: string,
  idempotencyKey: string,
  result: McpInvokeResult,
): void {
  store.set(key(tenantId, idempotencyKey), {
    result: { ...result, idempotentReplay: false },
    expiresAt: Date.now() + TTL_MS,
  });
}

export function resetIdempotencyForTests(): void {
  store.clear();
}

/** Puerto minimo: lo que hace falta de una conexion a PostgreSQL. */
export type PuertoIdempotenciaMcp = {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
};

/**
 * Reclama la ejecucion de una herramienta. Atomico entre instancias y reinicios.
 *
 * Reutiliza `erp_idempotency_keys`, que ya existe y cuya forma es generica
 * —inquilino, dominio y clave, con la clave primaria sobre los tres—. Su nombre
 * dice `erp` por su origen, pero `domain` es texto libre. Crear otra tabla igual
 * habria sido tocar el esquema para duplicar algo que ya esta.
 *
 * El dominio lleva el nombre de la herramienta: la misma clave de idempotencia
 * usada contra dos herramientas distintas son dos operaciones distintas, y
 * mezclarlas haria que una bloquease a la otra sin motivo.
 *
 * @returns `true` si es la PRIMERA vez (hay que ejecutar); `false` si ya estaba
 *   reclamada (es un duplicado y no se debe ejecutar).
 */
export async function reclamarEjecucionMcp(
  db: PuertoIdempotenciaMcp,
  tenantId: string,
  toolName: string,
  idempotencyKey: string,
): Promise<boolean> {
  const clave = idempotencyKey.trim().slice(0, 128);
  if (!clave) {
    // Sin clave no hay nada que deduplicar. Se deja pasar: quien no manda clave
    // no esta pidiendo deduplicacion, y descartarlo seria perder trabajo en
    // silencio.
    return true;
  }

  const filas = await db.query<{ idem_key: string }>(
    `INSERT INTO erp_idempotency_keys (tenant_id, domain, idem_key, entity_id, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (tenant_id, domain, idem_key) DO NOTHING
     RETURNING idem_key`,
    [tenantId, `mcp:${toolName}`, clave, toolName],
  );

  return filas.length > 0;
}

/**
 * Suelta una reclamacion.
 *
 * Se usa cuando la ejecucion falla y se quiere que el reintento del cliente
 * pueda volver a intentarlo. Sin esto, un fallo transitorio dejaria la clave
 * quemada para siempre y el cliente no podria reintentar nunca.
 */
export async function soltarEjecucionMcp(
  db: PuertoIdempotenciaMcp,
  tenantId: string,
  toolName: string,
  idempotencyKey: string,
): Promise<void> {
  const clave = idempotencyKey.trim().slice(0, 128);
  if (!clave) return;
  await db.query(
    `DELETE FROM erp_idempotency_keys
      WHERE tenant_id = $1 AND domain = $2 AND idem_key = $3`,
    [tenantId, `mcp:${toolName}`, clave],
  );
}
