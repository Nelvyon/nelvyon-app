import { beforeEach, describe, expect, it } from "vitest";
import {
  assertNelvyonOfficialSocialOpsIntegrity,
  attemptNelvyonManualPublish,
  buildNelvyonBrandLibrary,
  buildNelvyonOfficialSocialContentDrafts,
  buildNelvyonOfficialSocialOpsPackage,
  buildNelvyonOfficialSocialProfiles,
  buildNelvyonSocialAnalyticsPlan,
  buildNelvyonSocialPermissionsMatrix,
  resetNelvyonOfficialSocialOpsStateForTests,
} from "../NelvyonOfficialSocialOps";

describe("NELVYON official social — full ops package (still PREPARED_OFF)", () => {
  beforeEach(() => {
    resetNelvyonOfficialSocialOpsStateForTests();
  });

  it("builds 8 synthetic draft profiles, one per checklist platform", () => {
    const profiles = buildNelvyonOfficialSocialProfiles();
    expect(profiles).toHaveLength(8);
    expect(profiles.every((p) => p.status === "SYNTHETIC_DRAFT")).toBe(true);
    expect(profiles.every((p) => p.linkInBio === "https://nelvyon.com")).toBe(true);
  });

  it("builds a draft content library covering 4 weeks per platform", () => {
    const contents = buildNelvyonOfficialSocialContentDrafts();
    expect(contents.length).toBeGreaterThanOrEqual(8);
    expect(contents.every((c) => c.status === "draft_ready")).toBe(true);
    const weeks = new Set(contents.map((c) => c.week));
    expect(weeks).toEqual(new Set([1, 2, 3, 4]));
  });

  it("brand library is versioned and never uses a CDN", () => {
    const lib = buildNelvyonBrandLibrary();
    expect(lib.cdn).toBe("NONE");
    expect(lib.versions.length).toBeGreaterThan(0);
    expect(lib.currentVersion).toBe("v1");
    for (const v of lib.versions) {
      expect(v.ref).not.toMatch(/^https?:\/\//);
    }
  });

  it("analytics plan uses synthetic placeholders only", () => {
    const plan = buildNelvyonSocialAnalyticsPlan();
    expect(plan.metrics.length).toBeGreaterThan(0);
    expect(plan.metrics.every((m) => m.source === "synthetic_placeholder")).toBe(true);
  });

  it("permissions matrix: only ceo_ops can publish_manual", () => {
    const matrix = buildNelvyonSocialPermissionsMatrix();
    expect(matrix.ceo_ops).toContain("publish_manual");
    expect(matrix.social_strategist).not.toContain("publish_manual");
    expect(matrix.creative_director).not.toContain("publish_manual");
    expect(matrix.account_manager).not.toContain("publish_manual");
  });

  it("manual publish fails closed with BOTH_MISSING when nothing is set", () => {
    const result = attemptNelvyonManualPublish({ platform: "linkedin", contentId: "c1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("BOTH_MISSING");
  });

  it("manual publish fails closed when only OAuth is connected", () => {
    const result = attemptNelvyonManualPublish({
      platform: "linkedin",
      contentId: "c1",
      oauthConnected: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CEO_APPROVAL_MISSING");
  });

  it("manual publish fails closed when only CEO approval token is present", () => {
    const result = attemptNelvyonManualPublish({
      platform: "linkedin",
      contentId: "c1",
      ceoApprovalToken: "tok-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("OAUTH_NOT_CONNECTED");
  });

  it("allows exactly ONE approved test-post simulation, never a real network call, then blocks a second", () => {
    const first = attemptNelvyonManualPublish({
      platform: "linkedin",
      contentId: "c1",
      oauthConnected: true,
      ceoApprovalToken: "tok-1",
    });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.mode).toBe("single_test_post_simulation_in_memory");
      expect(first.network_call).toBe(false);
    }

    const second = attemptNelvyonManualPublish({
      platform: "linkedin",
      contentId: "c1",
      oauthConnected: true,
      ceoApprovalToken: "tok-1",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("TEST_POST_ALREADY_USED");
  });

  it("builds the full ops package with a non-empty rollback plan and 8-account checklist", () => {
    const pkg = buildNelvyonOfficialSocialOpsPackage();
    expect(pkg.ceoApprovalGate).toEqual({ ceoApprovalRequired: true, ceoApproved: false });
    expect(pkg.rollbackPlan.length).toBeGreaterThan(0);
    expect(pkg.accountsChecklist).toHaveLength(8);
    expect(pkg.strategyPackage.publish_authorized).toBe(false);
    expect(pkg.singleTestPostProtocol.realPostWaitsFor).toBe("Daniel (CEO)");
  });

  it("passes its own integrity assertion", () => {
    expect(assertNelvyonOfficialSocialOpsIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
