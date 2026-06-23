import { getGA4Service } from "../../../../../../backend/integrations/GoogleAnalytics4Service";

export type Ga4MvpRawMetrics = {
  period_days: number;
  property_id: string;
  total_sessions: number;
  total_conversions: number;
  traffic_sources: { channel: string; sessions: number; conversions: number }[];
  landing_pages: { landingPage: string; sessions: number; conversions: number }[];
  key_events: { eventName: string; eventCount: number }[];
  source: "ga4_api" | "demo_fixture";
};

export type Ga4MvpInsight = {
  headline: string;
  channel_breakdown: { channel: string; sessions: number; share_pct: number }[];
  landing_gap?: {
    path: string;
    sessions: number;
    conversion_rate_pct: number;
    site_avg_conversion_rate_pct: number;
    gap_pct: number;
  };
  missing_events: string[];
  recommendations: { action: string; impact: string; priority: "high" | "medium" | "low" }[];
};

const KEY_EVENTS = ["form_submit", "purchase", "generate_lead"];

function dateRangeForDays(periodDays: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (periodDays - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export async function fetchGa4MvpMetrics(params: {
  userId: string;
  propertyId?: string;
  periodDays?: number;
}): Promise<Ga4MvpRawMetrics> {
  const period_days = params.periodDays ?? 28;
  const range = dateRangeForDays(period_days);
  const ga4 = getGA4Service();
  const creds = await ga4.getCredentials(params.userId);
  const property_id = params.propertyId?.trim() || creds?.propertyId || "";

  const [traffic, landings, events] = await Promise.all([
    ga4.getTrafficSources(params.userId, range),
    ga4.getLandingPageStats(params.userId, range, 25),
    ga4.getKeyEventCounts(params.userId, range, KEY_EVENTS),
  ]);

  const total_sessions = traffic.reduce((a, t) => a + t.sessions, 0);
  const total_conversions = traffic.reduce((a, t) => a + t.conversions, 0);

  return {
    period_days,
    property_id,
    total_sessions,
    total_conversions,
    traffic_sources: traffic,
    landing_pages: landings,
    key_events: events,
    source: "ga4_api",
  };
}

export function computeMvpInsight(raw: Ga4MvpRawMetrics): Ga4MvpInsight {
  const totalSessions = raw.total_sessions || 1;
  const siteAvgRate = (raw.total_conversions / totalSessions) * 100;

  const channel_breakdown = [...raw.traffic_sources]
    .sort((a, b) => b.sessions - a.sessions)
    .map((t) => ({
      channel: t.channel,
      sessions: t.sessions,
      share_pct: Math.round((t.sessions / totalSessions) * 1000) / 10,
    }));

  const dominant = channel_breakdown[0];
  const minSessions = raw.source === "demo_fixture" ? 50 : 100;

  let landing_gap: Ga4MvpInsight["landing_gap"];
  for (const page of raw.landing_pages) {
    if (!page.landingPage || page.sessions < minSessions) continue;
    const rate = (page.conversions / page.sessions) * 100;
    if (siteAvgRate > 0 && rate < siteAvgRate * 0.7) {
      landing_gap = {
        path: page.landingPage,
        sessions: page.sessions,
        conversion_rate_pct: Math.round(rate * 10) / 10,
        site_avg_conversion_rate_pct: Math.round(siteAvgRate * 10) / 10,
        gap_pct: Math.round((siteAvgRate - rate) * 10) / 10,
      };
      break;
    }
  }

  const present = new Set(raw.key_events.filter((e) => e.eventCount > 0).map((e) => e.eventName));
  const missing_events = KEY_EVENTS.filter((e) => !present.has(e));

  const headline = dominant
    ? landing_gap
      ? `En ${raw.period_days} días, el ${dominant.share_pct}% de sesiones viene de ${dominant.channel}; ${landing_gap.path} convierte un ${landing_gap.gap_pct} pp por debajo de la media del sitio.`
      : `En ${raw.period_days} días, el ${dominant.share_pct}% de sesiones viene de ${dominant.channel} (${dominant.sessions.toLocaleString("es-ES")} sesiones).`
    : `Sin tráfico medible en GA4 en los últimos ${raw.period_days} días.`;

  const recommendations: Ga4MvpInsight["recommendations"] = [];
  if (landing_gap) {
    recommendations.push({
      action: `Optimizar CTA y fricción en ${landing_gap.path}`,
      impact: `Cerrar gap de ${landing_gap.gap_pct} pp vs. media del sitio`,
      priority: "high",
    });
  }
  if (dominant?.channel === "Organic Search") {
    recommendations.push({
      action: "Reforzar SEO en páginas de entrada orgánicas",
      impact: "Capitalizar el canal que ya trae la mayoría del tráfico",
      priority: "medium",
    });
  }
  if (missing_events.includes("form_submit")) {
    recommendations.push({
      action: "Configurar evento form_submit en GA4",
      impact: "Medir leads y atribución de campañas",
      priority: "high",
    });
  }
  if (missing_events.includes("purchase")) {
    recommendations.push({
      action: "Activar evento purchase o generate_lead según modelo de negocio",
      impact: "Visibilidad de conversión en informes ejecutivos",
      priority: "medium",
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      action: "Revisar embudos con más volumen la próxima semana",
      impact: "Detectar nuevas páginas con gap de conversión",
      priority: "low",
    });
  }

  return {
    headline,
    channel_breakdown,
    landing_gap,
    missing_events,
    recommendations: recommendations.slice(0, 3),
  };
}
