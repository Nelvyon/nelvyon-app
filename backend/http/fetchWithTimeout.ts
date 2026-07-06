/** Bounded fetch for external APIs — prevents cron/worker hangs on slow upstreams. */
export const EXTERNAL_FETCH_TIMEOUT_MS = 30_000;
export const CRM_SYNC_FETCH_TIMEOUT_MS = 45_000;

export type FetchWithTimeoutInit = RequestInit & { timeoutMs?: number };

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: FetchWithTimeoutInit,
): Promise<Response> {
  const { timeoutMs = EXTERNAL_FETCH_TIMEOUT_MS, signal, ...rest } = init ?? {};
  return fetch(input, {
    ...rest,
    signal: signal ?? AbortSignal.timeout(timeoutMs),
  });
}
