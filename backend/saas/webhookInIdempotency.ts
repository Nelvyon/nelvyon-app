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
