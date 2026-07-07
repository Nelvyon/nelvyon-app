import { describe, expect, it, vi } from "vitest";

import { buildGrowthPackReport } from "@/lib/packs/growthPackReport";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";
import { parsePlatformWorkspaceId, proxyPlatformFetch } from "@/lib/platformFastApiProxy";

describe("buildGrowthPackReport", () => {
  it("builds stable pack report shape", () => {
    const report = buildGrowthPackReport({
      packName: "Local Growth",
      packId: LOCAL_GROWTH_PACK_ID,
      intake: { business_name: "Café Sol", sector: "restaurant" },
      skuResults: [
        { sku: "NELVYON-LANDING", qa_score: 90, passed: true, escalated: false, deliverable_ids: ["d1"] },
        { sku: "NELVYON-SEO", qa_score: 88, passed: true, escalated: false, deliverable_ids: ["d2"] },
      ],
      saasClientId: 10,
      saasCampaignId: 20,
      extraCampaignCount: 1,
      extraDeliverableCount: 2,
      summary: "Test summary",
      nextSteps: ["Step A", "Step B"],
    });
    expect(report.pack_id).toBe(LOCAL_GROWTH_PACK_ID);
    expect(report.kpis?.avg_qa_score).toBe(89);
    expect(report.kpis?.deliverables_published).toBe(5);
    expect(report.next_steps).toEqual(["Step A", "Step B"]);
  });
});

describe("parsePlatformWorkspaceId", () => {
  it("parses valid workspace header", () => {
    const req = new Request("http://localhost", { headers: { "x-workspace-id": "42" } });
    expect(parsePlatformWorkspaceId(req)).toBe(42);
  });

  it("returns null when header missing", () => {
    expect(parsePlatformWorkspaceId(new Request("http://localhost"))).toBeNull();
  });
});

describe("proxyPlatformFetch requireWorkspace", () => {
  it("returns 400 when requireWorkspace and header missing", async () => {
    const tokenSpy = vi.spyOn(await import("@/lib/platformFastApiProxy"), "readSessionToken").mockResolvedValue("tok");
    const res = await proxyPlatformFetch(
      new Request("http://localhost", { headers: { authorization: "Bearer tok" } }),
      "GET",
      "/api/v1/entities/deals/1",
      {},
      { requireWorkspace: true },
    );
    tokenSpy.mockRestore();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/X-Workspace-Id/i);
  });
});
