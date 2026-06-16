import { describe, expect, it } from "vitest";

import {
  buildLocalPackCeoMetrics,
  formatWelcomeStatus,
  localPackCeoMetricsToDisplayRows,
} from "@/lib/packs/localPackCeoMetrics";

describe("localPackCeoMetrics", () => {
  it("builds five CEO KPIs with CPL when ads and leads exist", () => {
    const payload = buildLocalPackCeoMetrics({
      leads: 10,
      adsSpendEur: 250,
      adsSpendAvailable: true,
      appointments: 4,
      landingVisits: 200,
      landingConversions: 12,
      welcomeStatus: "sent",
      welcomeTouches: 3,
      welcomeCampaignName: "Bienvenida 3-touch",
    });

    expect(payload.metrics).toHaveLength(5);
    expect(payload.metrics.find((m) => m.key === "leads")?.value).toBe("10");
    expect(payload.metrics.find((m) => m.key === "cpl_approx")?.value).toBe("25 €");
    expect(payload.metrics.find((m) => m.key === "appointments")?.value).toBe("4");
    expect(payload.metrics.find((m) => m.key === "landing_to_lead_rate")?.value).toBe("6%");
    expect(payload.metrics.find((m) => m.key === "welcome_sequence_status")?.value).toBe(
      "Enviada (3-touch)",
    );
    expect(payload.degraded).toBe(false);
  });

  it("marks CPL unavailable without real ads spend", () => {
    const payload = buildLocalPackCeoMetrics({
      leads: 5,
      adsSpendEur: null,
      adsSpendAvailable: false,
      appointments: 0,
      landingVisits: 0,
      landingConversions: 0,
      welcomeStatus: null,
      welcomeTouches: null,
      welcomeCampaignName: null,
    });

    const cpl = payload.metrics.find((m) => m.key === "cpl_approx");
    expect(cpl?.value).toBe("—");
    expect(cpl?.available).toBe(false);
    expect(cpl?.limitation).toMatch(/simulador/i);
    expect(payload.degraded).toBe(true);
  });

  it("formats welcome status labels", () => {
    expect(formatWelcomeStatus("queued", 3)).toBe("En cola (3-touch)");
    expect(formatWelcomeStatus("no_api_key", 3)).toBe("Pendiente (falta SendGrid)");
    expect(formatWelcomeStatus("skipped", 0)).toBe("Omitida (sin email)");
  });

  it("maps metrics to dashboard display rows", () => {
    const payload = buildLocalPackCeoMetrics({
      leads: 1,
      adsSpendEur: null,
      adsSpendAvailable: false,
      appointments: 1,
      landingVisits: 10,
      landingConversions: 1,
      welcomeStatus: "ready",
      welcomeTouches: 3,
      welcomeCampaignName: null,
    });
    const rows = localPackCeoMetricsToDisplayRows(payload);
    expect(rows).toHaveLength(5);
    expect(rows[0].limitation).toBeTruthy();
  });
});
