import { bffDegraded, BFF_DEGRADED_NO_DATA, BFF_DEGRADED_OAUTH } from "@/lib/bffDegraded";
import { adsBffGet, adsBffPost } from "@/lib/adsBffRoute";

export { adsBffGet as reputacionBffGet, adsBffPost as reputacionBffPost };

export const EMPTY_REVIEWS_LIST = bffDegraded(
  { items: [] as Array<Record<string, unknown>> },
  BFF_DEGRADED_NO_DATA,
);

export const EMPTY_CONNECTION = bffDegraded(
  {
    platform: "google_business",
    connected: false,
    oauth_configured: false,
    profile_name: null as string | null,
    last_sync_at: null as string | null,
  },
  BFF_DEGRADED_OAUTH,
);

export const EMPTY_ALERTS = {
  items: [] as Array<{ id: string; review_id: string; severity: string; message: string; created_at: string }>,
  active_count: 0,
};

export const EMPTY_EMBED = {
  widget_id: "nelvyon-reviews",
  embed_html: '<div data-nelvyon-reviews="nelvyon"></div>',
  script_url: "/embed/reviews.js",
};

export const EMPTY_UNIFIED_REPUTACION = bffDegraded(
  {
    reviews: EMPTY_REVIEWS_LIST,
    connection: EMPTY_CONNECTION,
    alerts: EMPTY_ALERTS,
    unified: {
      total_reviews: 0,
      avg_rating: 0,
      positive_percent: 0,
      negative_percent: 0,
      neutral_percent: 0,
      active_alerts: 0,
      google_connected: false,
      degraded: true as const,
    },
  },
  BFF_DEGRADED_NO_DATA,
);

/** @deprecated Use EMPTY_REVIEWS_LIST — no demo reviews in production fallbacks. */
export function buildDemoReviewsList() {
  return EMPTY_REVIEWS_LIST;
}

export function buildDemoAlerts() {
  return EMPTY_ALERTS;
}

export function mergeUnifiedReputacion(
  reviews: { items?: Array<{ rating?: number; sentiment?: string }>; degraded?: boolean; degraded_reason?: string },
  connection: { connected?: boolean; degraded?: boolean; degraded_reason?: string },
  alerts: { active_count?: number },
) {
  const items = reviews.items ?? [];
  let ratingSum = 0;
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  for (const r of items) {
    ratingSum += Number(r.rating ?? 0);
    if (r.sentiment === "positive") positive += 1;
    else if (r.sentiment === "negative") negative += 1;
    else neutral += 1;
  }
  const total = items.length;
  const degraded = Boolean(reviews.degraded ?? connection.degraded ?? total === 0);
  const degradedReason =
    reviews.degraded_reason ?? connection.degraded_reason ?? BFF_DEGRADED_NO_DATA;
  return {
    reviews,
    connection,
    alerts,
    ...(degraded ? { degraded: true as const, degraded_reason: degradedReason } : {}),
    unified: {
      total_reviews: total,
      avg_rating: total ? Math.round((ratingSum / total) * 10) / 10 : 0,
      positive_percent: total ? Math.round((positive / total) * 100) : 0,
      negative_percent: total ? Math.round((negative / total) * 100) : 0,
      neutral_percent: total ? Math.round((neutral / total) * 100) : 0,
      active_alerts: alerts.active_count ?? 0,
      google_connected: Boolean(connection.connected),
      ...(degraded ? { degraded: true as const } : {}),
    },
  };
}
