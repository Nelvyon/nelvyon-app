import { describe, expect, it } from "vitest";

import { buildGa4DemoFixture } from "@/lib/integrations/ga4/ga4DemoFixture";
import { computeMvpInsight } from "@/lib/integrations/ga4/ga4Insights";

describe("ga4Insights", () => {
  it("computes dominant channel and landing gap from fixture", () => {
    const raw = buildGa4DemoFixture(28);
    const insight = computeMvpInsight(raw);
    expect(insight.channel_breakdown[0]?.channel).toBe("Organic Search");
    expect(insight.headline).toContain("Organic Search");
    expect(insight.recommendations.length).toBeGreaterThan(0);
    expect(insight.landing_gap?.path).toBe("/reservar");
  });

  it("flags missing purchase event", () => {
    const raw = buildGa4DemoFixture(28);
    const insight = computeMvpInsight(raw);
    expect(insight.missing_events).toContain("purchase");
  });
});
