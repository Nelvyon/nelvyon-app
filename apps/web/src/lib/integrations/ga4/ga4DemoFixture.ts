import type { Ga4MvpRawMetrics } from "@/lib/integrations/ga4/ga4Insights";

/** Fixture GA4 para staging/demo cuando no hay OAuth conectado. */
export function buildGa4DemoFixture(periodDays: number): Ga4MvpRawMetrics {
  return {
    period_days: periodDays,
    property_id: "demo-property",
    total_sessions: 4820,
    total_conversions: 142,
    traffic_sources: [
      { channel: "Organic Search", sessions: 1928, conversions: 68 },
      { channel: "Direct", sessions: 1205, conversions: 41 },
      { channel: "Paid Search", sessions: 964, conversions: 22 },
      { channel: "Organic Social", sessions: 482, conversions: 8 },
      { channel: "Referral", sessions: 241, conversions: 3 },
    ],
    landing_pages: [
      { landingPage: "/", sessions: 2100, conversions: 84 },
      { landingPage: "/reservar", sessions: 890, conversions: 12 },
      { landingPage: "/servicios", sessions: 620, conversions: 28 },
      { landingPage: "/contacto", sessions: 410, conversions: 18 },
    ],
    key_events: [
      { eventName: "page_view", eventCount: 12400 },
      { eventName: "form_submit", eventCount: 96 },
      { eventName: "purchase", eventCount: 0 },
    ],
    source: "demo_fixture",
  };
}
