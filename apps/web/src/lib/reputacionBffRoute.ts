import { adsBffGet, adsBffPost } from "@/lib/adsBffRoute";

export { adsBffGet as reputacionBffGet, adsBffPost as reputacionBffPost };

export const DEMO_REVIEWS = [
  {
    id: "r1",
    platform: "google",
    author: "María G.",
    rating: 5,
    text: "Atención excelente y entrega rápida. Repetiré sin duda.",
    sentiment: "positive",
    created_at: "2026-06-10T14:22:00Z",
    location: "Madrid",
  },
  {
    id: "r2",
    platform: "google",
    author: "Carlos R.",
    rating: 2,
    text: "El producto llegó tarde y nadie respondió al teléfono.",
    sentiment: "negative",
    created_at: "2026-06-12T09:15:00Z",
    location: "Barcelona",
  },
  {
    id: "r3",
    platform: "google",
    author: "Laura P.",
    rating: 4,
    text: "Buena experiencia en general, solo mejoraría los tiempos de espera.",
    sentiment: "neutral",
    created_at: "2026-06-11T18:40:00Z",
    location: "Valencia",
  },
  {
    id: "r4",
    platform: "google",
    author: "Jorge M.",
    rating: 1,
    text: "Muy decepcionado con el servicio postventa.",
    sentiment: "negative",
    created_at: "2026-06-13T11:05:00Z",
    location: "Sevilla",
  },
];

export const EMPTY_REVIEWS_LIST = { items: [] as typeof DEMO_REVIEWS, mock: true };

export const EMPTY_CONNECTION = {
  platform: "google_business",
  connected: false,
  mock: true,
  oauth_configured: false,
  profile_name: null as string | null,
  last_sync_at: null as string | null,
};

export const EMPTY_ALERTS = {
  items: [] as Array<{ id: string; review_id: string; severity: string; message: string; created_at: string }>,
  active_count: 0,
};

export const EMPTY_EMBED = {
  widget_id: "nelvyon-reviews",
  embed_html: '<div data-nelvyon-reviews="demo"></div>',
  script_url: "/embed/reviews.js",
};

export const EMPTY_UNIFIED_REPUTACION = {
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
    mock: true,
  },
};

export function buildDemoReviewsList() {
  return { items: DEMO_REVIEWS, mock: true };
}

export function buildDemoAlerts() {
  const negatives = DEMO_REVIEWS.filter((r) => r.sentiment === "negative");
  return {
    items: negatives.map((r) => ({
      id: `alert-${r.id}`,
      review_id: r.id,
      severity: r.rating <= 2 ? "high" : "medium",
      message: `Nueva reseña negativa de ${r.author}: ${r.text.slice(0, 60)}…`,
      created_at: r.created_at,
    })),
    active_count: negatives.length,
  };
}

export function mergeUnifiedReputacion(
  reviews: { items?: Array<{ rating?: number; sentiment?: string }>; mock?: boolean },
  connection: { connected?: boolean; mock?: boolean },
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
  return {
    reviews,
    connection,
    alerts,
    unified: {
      total_reviews: total,
      avg_rating: total ? Math.round((ratingSum / total) * 10) / 10 : 0,
      positive_percent: total ? Math.round((positive / total) * 100) : 0,
      negative_percent: total ? Math.round((negative / total) * 100) : 0,
      neutral_percent: total ? Math.round((neutral / total) * 100) : 0,
      active_alerts: alerts.active_count ?? 0,
      google_connected: Boolean(connection.connected),
      mock: Boolean(reviews.mock ?? connection.mock ?? true),
    },
  };
}
