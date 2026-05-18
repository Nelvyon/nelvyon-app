/**
 * Scalability Utilities — Caching, pagination, debounced fetching.
 * Designed for 200M+ user scale with efficient resource usage.
 */

// ── In-Memory Cache with TTL ──
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const _cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60_000; // 5 minutes

/** Get from cache, returns undefined if expired or missing */
export function cacheGet<T>(key: string): T | undefined {
  const entry = _cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return undefined;
  }
  return entry.data;
}

/** Set cache with optional TTL in ms */
export function cacheSet<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS) {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** Invalidate a cache key or pattern */
export function cacheInvalidate(keyOrPrefix: string) {
  if (keyOrPrefix.endsWith("*")) {
    const prefix = keyOrPrefix.slice(0, -1);
    for (const k of _cache.keys()) {
      if (k.startsWith(prefix)) _cache.delete(k);
    }
  } else {
    _cache.delete(keyOrPrefix);
  }
}

/** Clear entire cache */
export function cacheClear() {
  _cache.clear();
}

// ── Pagination Helper ──
export interface PaginationParams {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Client-side pagination of an array */
export function paginate<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 20,
): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const start = (safePage - 1) * pageSize;
  const data = items.slice(start, start + pageSize);

  return {
    data,
    page: safePage,
    pageSize,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

// ── Debounced Fetch ──
const _pendingDebounce = new Map<string, ReturnType<typeof setTimeout>>();

/** Debounce a function call by key */
export function debouncedCall(key: string, fn: () => void, delayMs: number = 300) {
  const existing = _pendingDebounce.get(key);
  if (existing) clearTimeout(existing);
  _pendingDebounce.set(
    key,
    setTimeout(() => {
      _pendingDebounce.delete(key);
      fn();
    }, delayMs),
  );
}

// ── Cached Fetch with dedup ──
const _inflightRequests = new Map<string, Promise<unknown>>();

/**
 * Fetch with caching and request deduplication.
 * If the same URL is already in-flight, returns the same promise.
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const cacheKey = `fetch:${url}`;

  // Check cache first
  const cached = cacheGet<T>(cacheKey);
  if (cached !== undefined) return cached;

  // Dedup in-flight requests
  const inflight = _inflightRequests.get(cacheKey);
  if (inflight) return inflight as Promise<T>;

  const promise = (async () => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as T;
      cacheSet(cacheKey, data, ttlMs);
      return data;
    } finally {
      _inflightRequests.delete(cacheKey);
    }
  })();

  _inflightRequests.set(cacheKey, promise);
  return promise;
}

// ── Batch Request Helper ──
/**
 * Batch multiple IDs into a single request.
 * Useful for fetching details of many items at once.
 */
export function batchIds(ids: string[], batchSize: number = 50): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(ids.slice(i, i + batchSize));
  }
  return batches;
}