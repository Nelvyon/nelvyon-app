/**
 * Blocks D–G — promoted agents, workflows, leaderboard, canary gates.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  listUnifiedAgents,
  runAgentEvalSuite,
  WORKFORCE_WORKFLOWS,
  workflowCatalogStatus,
  seedFromEvalSummary,
  leaderboardForCapability,
  resetLeaderboardForTests,
  startCanaryImprovement,
  runCanaryGates,
  enterCanary,
  promoteCanary,
  autoRollbackCanary,
  promotionAllowed,
  resetCanariesForTests,
  resetImprovementProposalsForTests,
  capabilityMatrixSnapshot,
  EPHEMERAL_ONLY_DESIGN_IDS,
} from "../../agents";
import { listMappedAgentTools } from "../../private-ai/tools/toolIdMap";

describe("Workforce Blocks D–G", () => {
  afterEach(() => {
    resetLeaderboardForTests();
    resetCanariesForTests();
    resetImprovementProposalsForTests();
  });

  it("promotes cto/marketing/ops/devops/social/product/ads to runtimeReady", () => {
    const ids = [
      "cto",
      "marketing",
      "operations",
      "devops",
      "social_media",
      "product",
      "google_ads",
      "meta_ads",
      "tiktok_ads",
    ];
    const byId = new Map(listUnifiedAgents().map((a) => [a.id, a]));
    for (const id of ids) {
      const a = byId.get(id);
      expect(a?.runtimeReady, id).toBe(true);
      expect(a?.source === "both" || a?.source === "private_ai", id).toBe(true);
      expect(a?.lifecycle).toBe("evaluated");
    }
    for (const id of EPHEMERAL_ONLY_DESIGN_IDS) {
      const a = byId.get(id);
      expect(a?.runtimeReady, id).toBe(false);
    }
  });

  it("expands MCP tool map beyond original 7", () => {
    expect(listMappedAgentTools().length).toBeGreaterThanOrEqual(12);
    const snap = capabilityMatrixSnapshot();
    expect(snap.agents).toBeGreaterThanOrEqual(20);
  });

  it("runs ads + cto + marketing eval cases", async () => {
    const report = await runAgentEvalSuite();
    const needed = [
      "google_ads_draft",
      "meta_ads_draft",
      "tiktok_ads_draft",
      "cto_arch_review",
      "marketing_gtm",
    ];
    for (const id of needed) {
      const r = report.results.find((x) => x.caseId === id);
      expect(r, id).toBeTruthy();
      expect(r!.passed, id).toBe(true);
    }
  });

  it("certifies workflow catalog across domains", () => {
    const st = workflowCatalogStatus();
    expect(st.certified).toBe(WORKFORCE_WORKFLOWS.length);
    expect(st.byDomain.engineering).toBeGreaterThanOrEqual(10);
    expect(st.byDomain.growth).toBeGreaterThanOrEqual(5);
    expect(st.byDomain.customer).toBeGreaterThanOrEqual(4);
    expect(st.byDomain.finance).toBeGreaterThanOrEqual(4);
    expect(st.byDomain.executive).toBeGreaterThanOrEqual(2);
  });

  it("leaderboard ranks by capability not global score", () => {
    seedFromEvalSummary([
      { agentId: "seo", capability: "task_success", score: 0.9 },
      { agentId: "sales", capability: "task_success", score: 0.8 },
      { agentId: "seo", capability: "security", score: 1 },
      { agentId: "sales", capability: "security", score: 1 },
    ]);
    const task = leaderboardForCapability("task_success");
    expect(task[0]?.agentId).toBe("seo");
    const sec = leaderboardForCapability("security");
    expect(sec.length).toBe(2);
  });

  it("canary blocks security regression and allows safe promote+rollback", () => {
    const blocked = promotionAllowed({
      securityWorse: true,
      isolationWorse: false,
      hallucinationUp: false,
      criticalAccuracyDown: false,
      resourceExcess: false,
      sloBreach: false,
      rollbackLost: false,
    });
    expect(blocked.ok).toBe(false);

    const { canary } = startCanaryImprovement({
      targetId: "seo",
      rationale: "tighten next-steps format",
      proposedChange: "prompt v2",
      baselineMetric: "task_success",
      risk: "medium",
    });
    const gated = runCanaryGates(
      canary.id,
      { baseline: 0.8, candidate: 0.85 },
      {
        securityWorse: false,
        isolationWorse: false,
        hallucinationUp: false,
        criticalAccuracyDown: false,
        resourceExcess: false,
        sloBreach: false,
        rollbackLost: false,
      },
    );
    expect(gated.state).toBe("approved");
    enterCanary(canary.id);
    promoteCanary(canary.id, { approvedBy: "test", version: "v2" });
    const rb = autoRollbackCanary(canary.id, "latency_spike");
    expect(rb.state).toBe("rolled_back");
  });
});
