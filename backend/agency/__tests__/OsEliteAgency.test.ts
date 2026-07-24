import { describe, expect, it } from "vitest";
import {
  assertOsProfessionalTeamsIntegrity,
  listOsProfessionalTeams,
  OS_CRITICAL_QA_MIN_SCORE,
  OS_DELIVERABLE_FLOW,
} from "../OsProfessionalTeams";
import { evaluateEliteQa, QA_ELITE_REGRESSION_SEED, resolveQaThreshold } from "../OsEliteQaPolicy";
import { OS_QA_MIN_SCORE } from "../OsCapabilityRegistry";
import { runIndependentAuditor, isPackIndependentAuditorEnabled } from "../OsIndependentAuditor";
import {
  planNelvyonOsOrchestration,
  OPENCLAW_COORDINATION_RULES,
} from "../NelvyonOsOrchestratorContract";
import {
  getVisualGenerationProvider,
  isVisualGenerationSpendEnabled,
  OffVisualGenerationProvider,
} from "../VisualGenerationProvider";

describe("OS Elite agency (ADR-051)", () => {
  it("professional teams catalog is integral", () => {
    const check = assertOsProfessionalTeamsIntegrity();
    expect(check.violations).toEqual([]);
    expect(listOsProfessionalTeams().length).toBeGreaterThanOrEqual(15);
    expect(OS_DELIVERABLE_FLOW[0]).toBe("specialist_team");
    expect(OS_DELIVERABLE_FLOW.includes("independent_auditor")).toBe(true);
  });

  it("never lowers QA below 85; critical is 90", () => {
    expect(OS_QA_MIN_SCORE).toBe(85);
    expect(OS_CRITICAL_QA_MIN_SCORE).toBe(90);
    expect(resolveQaThreshold(false)).toBe(85);
    expect(resolveQaThreshold(true)).toBe(90);
    expect(QA_ELITE_REGRESSION_SEED.some((r) => r.id === "reg-qa-threshold-85")).toBe(true);
  });

  it("elite QA rejects self-approval and false promises", () => {
    const v = evaluateEliteQa({
      score: 95,
      critical: true,
      flags: { false_promise: true },
      producerAttemptedSelfApprove: true,
    });
    expect(v.passed).toBe(false);
    expect(v.rejections).toEqual(
      expect.arrayContaining(["false_promise", "self_approval_attempt"]),
    );
  });

  it("independent auditor is OFF by default", () => {
    const prev = process.env.NELVYON_PACK_INDEPENDENT_AUDITOR;
    delete process.env.NELVYON_PACK_INDEPENDENT_AUDITOR;
    expect(isPackIndependentAuditorEnabled()).toBe(false);
    const r = runIndependentAuditor({
      packId: "local-business-growth",
      packRunId: "x",
      workspaceId: 1,
      avgQaScore: 90,
    });
    expect(r.skipped).toBe(true);
    expect(r.blockPublish).toBe(false);
    if (prev === undefined) delete process.env.NELVYON_PACK_INDEPENDENT_AUDITOR;
    else process.env.NELVYON_PACK_INDEPENDENT_AUDITOR = prev;
  });

  it("OpenClaw coordination stays blocked while OFF", () => {
    delete process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED;
    delete process.env.NELVYON_OPENCLAW_STAGING_MODE;
    delete process.env.NELVYON_SHARED_MEMORY_ENABLED;
    expect(OPENCLAW_COORDINATION_RULES.defaultOff).toBe(true);
    expect(OPENCLAW_COORDINATION_RULES.noSelfApprove).toBe(true);
    const d = planNelvyonOsOrchestration({
      briefId: "b1",
      workspaceId: 2,
      tenantId: "t1",
      specialistTeamId: "svc_web_ux_cro",
      evidencePresent: true,
    });
    expect(d.accept).toBe(false);
    expect(d.blockReasons).toContain("openclaw_off");
    expect(d.status).toBe("blocked");
  });

  it("visual generation provider is OFF and does not spend", async () => {
    expect(isVisualGenerationSpendEnabled()).toBe(false);
    const p = getVisualGenerationProvider();
    expect(p).toBeInstanceOf(OffVisualGenerationProvider);
    const res = await p.generate({
      workspaceId: 1,
      tenantId: "t",
      kind: "image",
      prompt: "hero product",
      budgetCentsMax: 0,
      commercialUse: true,
    });
    expect(res.costCents).toBe(0);
    expect(res.mode).toBe("strategy_only");
    expect(res.errorCode).toBe("PROVIDER_OFF");
  });
});
