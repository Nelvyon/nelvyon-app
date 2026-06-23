import { describe, expect, it } from "vitest";

import {
  buildSaasB2bCeoMetrics,
  formatNurtureStatus,
  saasB2bCeoMetricsToDisplayRows,
} from "@/lib/packs/saasB2bPackCeoMetrics";

describe("saasB2bPackCeoMetrics", () => {
  it("builds five SaaS CEO KPIs", () => {
    const payload = buildSaasB2bCeoMetrics({
      mqls: 3,
      trialDemoLeads: 8,
      demosBooked: 2,
      pipelineCount: 5,
      pipelineValueEur: 12000,
      nurtureStatus: "sent",
      nurtureTouches: 5,
      nurtureCampaignName: "Nurture B2B",
    });

    expect(payload.metrics).toHaveLength(5);
    expect(payload.metrics.find((m) => m.key === "mqls")?.value).toBe("3");
    expect(payload.metrics.find((m) => m.key === "pipeline_opportunities")?.value).toBe("5");
    expect(payload.metrics.find((m) => m.key === "nurture_sequence_status")?.value).toBe(
      "Enviada (5-touch)",
    );
  });

  it("includes limitation text on each metric", () => {
    const payload = buildSaasB2bCeoMetrics({
      mqls: 0,
      trialDemoLeads: 0,
      demosBooked: 0,
      pipelineCount: 0,
      pipelineValueEur: 0,
      nurtureStatus: null,
      nurtureTouches: null,
      nurtureCampaignName: null,
    });
    const rows = saasB2bCeoMetricsToDisplayRows(payload);
    expect(rows.every((r) => r.limitation && r.limitation.length > 10)).toBe(true);
  });

  it("formats nurture status", () => {
    expect(formatNurtureStatus("queued", 5)).toBe("Enviada (5-touch)");
  });
});
