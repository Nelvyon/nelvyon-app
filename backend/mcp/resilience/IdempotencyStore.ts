/**
 * In-memory idempotency store — survives within process; optional DB later.
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
