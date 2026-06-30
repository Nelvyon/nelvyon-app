/** Honest BFF fallback when upstream is missing or OAuth/env not configured. */
export type BffDegradedMeta = {
  degraded: true;
  degraded_reason: string;
};

export function bffDegraded<T extends Record<string, unknown>>(
  payload: T,
  reason: string,
): T & BffDegradedMeta {
  return { ...payload, degraded: true, degraded_reason: reason };
}

export const BFF_DEGRADED_UPSTREAM = "upstream_unavailable";
export const BFF_DEGRADED_OAUTH = "oauth_not_configured";
export const BFF_DEGRADED_NO_DATA = "no_live_data";
