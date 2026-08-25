/**
 * Process-local idempotency for inbound workflow webhooks.
 * Survives within one Node process (same class as MCP IdempotencyStore).
 * Duplicate POSTs with the same tenant+source+key short-circuit without re-dispatch.
 */

type Entry = { receivedAt: string; expiresAt: number };

const store = new Map<string, Entry>();
const TTL_MS = 15 * 60_000;
const MAX_KEYS = 10_000;

function key(tenantId: string, source: string, idempotencyKey: string): string {
  return `${tenantId}::${source}::${idempotencyKey.slice(0, 128)}`;
}

function pruneExpired(now: number): void {
  if (store.size < MAX_KEYS) return;
  for (const [k, v] of store) {
    if (v.expiresAt <= now) store.delete(k);
  }
  if (store.size >= MAX_KEYS) {
    const oldest = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    for (let i = 0; i < Math.ceil(oldest.length / 10); i++) {
      store.delete(oldest[i]![0]);
    }
  }
}

/** @returns previous receipt ISO if duplicate; null if first claim. */
export function claimWebhookInIdempotency(
  tenantId: string,
  source: string,
  idempotencyKey: string,
): string | null {
  const trimmed = idempotencyKey.trim();
  if (!trimmed) return null;
  const now = Date.now();
  pruneExpired(now);
  const k = key(tenantId, source, trimmed);
  const existing = store.get(k);
  if (existing && existing.expiresAt > now) {
    return existing.receivedAt;
  }
  const receivedAt = new Date(now).toISOString();
  store.set(k, { receivedAt, expiresAt: now + TTL_MS });
  return null;
}

export function releaseWebhookInIdempotency(
  tenantId: string,
  source: string,
  idempotencyKey: string,
): void {
  const trimmed = idempotencyKey.trim();
  if (!trimmed) return;
  store.delete(key(tenantId, source, trimmed));
}

export function resetWebhookInIdempotencyForTests(): void {
  store.clear();
}

// ────────────────────────────────────────────────────────────────────────────
// Idempotencia PERSISTENTE — la que sirve entre instancias
// ────────────────────────────────────────────────────────────────────────────
//
// Todo lo de arriba vive en un `Map` dentro del proceso. Eso deduplica mientras
// el proceso siga en pie y solo haya uno. En cuanto hay dos instancias —o una
// que se reinicia entre dos entregas del mismo webhook— deja de deduplicar, y
// `dispatchWebhookIn` vuelve a lanzar los workflows del inquilino: correos,
// llamadas a integraciones, lo que el flujo haga.
//
// «Idempotente dentro de un proceso» no es idempotente. El proveedor reintenta
// contra el balanceador, no contra un proceso concreto.
//
// La garantía la da PostgreSQL con una tabla que YA EXISTE:
// `erp_idempotency_keys`, con clave primaria `(tenant_id, domain, idem_key)`.
// No hacía falta migración: el `INSERT ... ON CONFLICT DO NOTHING RETURNING`
// resuelve la carrera en la propia base, que es donde se puede resolver.
//
// El nombre de la tabla dice `erp` por su origen, pero su forma es genérica
// —inquilino, dominio y clave— y `domain` es texto libre. Reutilizarla es mejor
// que crear otra igual: una migración nueva sería tocar producción para
// duplicar algo que ya está.

/** Puerto mínimo: lo que hace falta de una conexión a PostgreSQL. */
export type PuertoIdempotencia = {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
};

const DOMINIO = "webhook_in";

/**
 * Reclama la entrega en PostgreSQL. Atómico entre instancias y entre reinicios.
 *
 * @returns `true` si es la PRIMERA vez que se ve esta entrega (hay que
 *   procesarla); `false` si ya estaba reclamada (es un duplicado).
 */
export async function reclamarEntregaPersistente(
  db: PuertoIdempotencia,
  tenantId: string,
  source: string,
  idempotencyKey: string,
): Promise<boolean> {
  const clave = idempotencyKey.trim().slice(0, 128);
  if (!clave) {
    // Sin clave no hay nada que deduplicar. Devolver `true` deja pasar la
    // entrega, que es lo correcto: es preferible procesar algo sin clave a
    // descartarlo en silencio.
    return true;
  }

  const filas = await db.query<{ idem_key: string }>(
    `INSERT INTO erp_idempotency_keys (tenant_id, domain, idem_key, entity_id, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (tenant_id, domain, idem_key) DO NOTHING
     RETURNING idem_key`,
    [tenantId, `${DOMINIO}:${source}`, clave, source],
  );

  return filas.length > 0;
}

/**
 * Suelta una reclamación persistente.
 *
 * Se usa cuando el procesamiento falla y se quiere que el reintento del
 * proveedor vuelva a entrar. Sin esto, un fallo transitorio dejaría la entrega
 * marcada para siempre y el reintento la descartaría como duplicado: el evento
 * se perdería sin que nadie lo notase, que es peor que procesarlo dos veces.
 */
export async function soltarEntregaPersistente(
  db: PuertoIdempotencia,
  tenantId: string,
  source: string,
  idempotencyKey: string,
): Promise<void> {
  const clave = idempotencyKey.trim().slice(0, 128);
  if (!clave) return;
  await db.query(
    `DELETE FROM erp_idempotency_keys
      WHERE tenant_id = $1 AND domain = $2 AND idem_key = $3`,
    [tenantId, `${DOMINIO}:${source}`, clave],
  );
}
