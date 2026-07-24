import { describe, expect, it, beforeEach } from "vitest";
import {
  auditorReview,
  openIndependentAuditSession,
  resetIndependentAuditSessionsForTests,
  runIndependentAuditorE2eScenario,
  submitProducerRepair,
} from "../OsIndependentAuditSession";
import { runIndependentAuditor, isPackIndependentAuditorEnabled } from "../OsIndependentAuditor";
import {
  assertOpenClawStagingIntegrity,
  exportOpenClawStagingAuditTrail,
  isOpenClawStagingAuthorized,
  resetOpenClawStagingIdempotencyForTests,
  runOpenClawStagingCoordination,
} from "../OpenClawStagingCoordinator";
import {
  OS_CATALOG_V1_VERSION,
  assertOsCatalogV1Integrity,
  listOsCatalogV1,
  osCatalogV1Summary,
} from "../OsCatalogV1";
import { planNelvyonOsOrchestration } from "../NelvyonOsOrchestratorContract";
import { isOpenClawRuntimeAuthorized } from "../../openclaw/contracts";

describe("ADR-053 — auditor + OpenClaw staging + catalog v1", () => {
  beforeEach(() => {
    resetIndependentAuditSessionsForTests();
    resetOpenClawStagingIdempotencyForTests();
    delete process.env.NELVYON_PACK_INDEPENDENT_AUDITOR;
    delete process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED;
    delete process.env.NELVYON_OPENCLAW_STAGING_MODE;
    delete process.env.NELVYON_SHARED_MEMORY_ENABLED;
  });

  it("independent auditor OFF by default; ON can PASS and REJECT", () => {
    expect(isPackIndependentAuditorEnabled()).toBe(false);
    expect(runIndependentAuditor({ packId: "x", packRunId: "y", workspaceId: 1, avgQaScore: 50 }).skipped).toBe(
      true,
    );

    process.env.NELVYON_PACK_INDEPENDENT_AUDITOR = "1";
    const pass = runIndependentAuditor({
      packId: "social-calendar-pack",
      packRunId: "r1",
      workspaceId: 2,
      avgQaScore: 92,
      critical: true,
    });
    expect(pass.skipped).toBe(false);
    expect(pass.blockPublish).toBe(false);

    const reject = runIndependentAuditor({
      packId: "social-calendar-pack",
      packRunId: "r2",
      workspaceId: 2,
      avgQaScore: 70,
      critical: true,
      containsMockUrl: true,
    });
    expect(reject.blockPublish).toBe(true);
    expect(reject.reason).toMatch(/mock/);
  });

  it("E2E session: correct PASS; defective REJECT+repair; second review PASS", () => {
    const r = runIndependentAuditorE2eScenario();
    expect(r.ok).toBe(true);
    expect(r.evidence[0]?.status).toBe("approved");
    expect(r.evidence[1]?.status).toBe("approved");
    expect(r.evidence[1]?.rounds).toBeGreaterThanOrEqual(2);
    expect(r.evidence[1]?.evidence.some((e) => e.action === "repair_submitted")).toBe(true);
  });

  it("auditor team is separate from producer", () => {
    process.env.NELVYON_PACK_INDEPENDENT_AUDITOR = "1";
    const s = openIndependentAuditSession({
      packId: "p",
      packRunId: "r",
      workspaceId: 2,
      producerTeamId: "svc_social_creative",
    });
    expect(s.auditorTeamId).toBe("global_independent_auditor");
    expect(s.producerTeamId).not.toBe(s.auditorTeamId);
    auditorReview(s.sessionId, { avgQaScore: 60, critical: true });
    expect(["rejected", "repair_required"]).toContain(s.status);
    submitProducerRepair(s.sessionId, "fixed copy");
    auditorReview(s.sessionId, { avgQaScore: 91, critical: true });
    expect(s.status).toBe("approved");
  });

  it("OpenClaw staging coordination ALL_PASS with fail-closed controls", async () => {
    expect(isOpenClawStagingAuthorized()).toBe(false);
    process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED = "1";
    process.env.NELVYON_OPENCLAW_STAGING_MODE = "1";
    expect(isOpenClawRuntimeAuthorized()).toBe(true);
    expect(assertOpenClawStagingIntegrity().ok).toBe(true);

    const r = await runOpenClawStagingCoordination({
      tenantId: "tenant-a",
      briefId: "brief-1",
      workspaceId: 2,
      idempotencyKey: "idem-1",
    });
    expect(r.ok).toBe(true);
    expect(r.auditorE2eOk).toBe(true);
    expect(r.steps.find((s) => s.step === "tenant_isolation")?.ok).toBe(true);
    expect(r.steps.find((s) => s.step === "permissions_tenant_required")?.ok).toBe(true);
    expect(r.teamAssignments.length).toBeGreaterThanOrEqual(4);
    expect(r.teamAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ teamId: "svc_social_creative", roleId: "social_strategist" }),
        expect.objectContaining({ teamId: "global_qa_elite", roleId: "qa_technical" }),
        expect.objectContaining({ teamId: "global_independent_auditor", roleId: "independent_auditor" }),
        expect.objectContaining({ teamId: "global_ops_success", roleId: "cs_ops" }),
      ]),
    );
    expect(r.backoffPlanMs.length).toBeGreaterThan(0);
    expect(r.idempotencyMapSize).toBeGreaterThanOrEqual(1);
    expect(r.unauthorizedRejectionOk).toBe(true);
    expect(r.failureInjectionRecoveryOk).toBe(true);
    expect(r.steps.find((s) => s.step === "task_assignment")?.ok).toBe(true);
    expect(r.steps.find((s) => s.step === "unauthorized_action_rejected")?.ok).toBe(true);
    expect(r.steps.find((s) => s.step === "failure_injection_recovery")?.ok).toBe(true);

    const trail = exportOpenClawStagingAuditTrail(r);
    expect(trail.length).toBe(r.steps.length);
    expect(trail.every((e) => typeof e.exportedAt === "string")).toBe(true);

    const dup = await runOpenClawStagingCoordination({
      tenantId: "tenant-a",
      briefId: "brief-1",
      workspaceId: 2,
      idempotencyKey: "idem-1",
    });
    expect(dup.ok).toBe(false);
    expect(dup.blocked).toContain("idempotency_conflict");
    expect(dup.teamAssignments).toEqual([]);

    const miss = await runOpenClawStagingCoordination({
      forceMissingContext: true,
      idempotencyKey: "idem-miss",
    });
    expect(miss.ok).toBe(false);
    expect(miss.blocked.length).toBeGreaterThan(0);

    const plan = planNelvyonOsOrchestration({
      briefId: "b",
      workspaceId: 2,
      tenantId: "t",
      specialistTeamId: "svc_social_creative",
      evidencePresent: true,
      allowSpend: true,
    });
    expect(plan.accept).toBe(false);
    expect(plan.blockReasons).toContain("spend_requires_ceo");
  }, 30_000);

  it("OS Catalog v1 is versioned and honest", () => {
    expect(OS_CATALOG_V1_VERSION).toBe("1.2.0");
    const check = assertOsCatalogV1Integrity();
    expect(check.violations).toEqual([]);
    expect(listOsCatalogV1().length).toBeGreaterThanOrEqual(15);
    const summary = osCatalogV1Summary();
    expect(summary.IMPLEMENTED_VERIFIED).toBeGreaterThanOrEqual(10);
    expect(summary.NOT_IMPLEMENTED).toBeGreaterThanOrEqual(1);
    expect(summary.PREPARED_OFF + summary.BLOCKED_EXTERNAL).toBeGreaterThanOrEqual(2);
    const ads = listOsCatalogV1().find((e) => e.serviceId === "ads");
    expect(ads?.status).toBe("BLOCKED_EXTERNAL");
    const social = listOsCatalogV1().find((e) => e.serviceId === "content_social");
    expect(social?.status).toBe("IMPLEMENTED_VERIFIED");
    expect(social?.e2eEvidence).toBeTruthy();
  });

  it("OS Catalog v1.1.0 entries carry roles, flow, and non-empty certificationCriteria", () => {
    const entries = listOsCatalogV1();
    for (const e of entries) {
      expect(e.roles?.length ?? 0).toBeGreaterThan(0);
      expect(e.flow?.length ?? 0).toBeGreaterThan(0);
      expect(e.certificationCriteria?.length ?? 0).toBeGreaterThan(0);
    }
    const social = entries.find((e) => e.serviceId === "content_social");
    expect(social?.flow).toContain("authorized_schedule_or_publish");
    expect(social?.roles).toEqual(expect.arrayContaining(["social_strategist", "paid_social"]));
    const webLanding = entries.find((e) => e.serviceId === "web_landing");
    expect(webLanding?.flow).toEqual(expect.arrayContaining(["independent_auditor", "client_portal"]));
    const implemented = entries.filter((e) => e.status === "IMPLEMENTED_VERIFIED");
    expect(implemented.every((e) => (e.certificationCriteria?.length ?? 0) > 0)).toBe(true);
  });
});
