import { describe, expect, it } from "vitest";
import {
  assertNelvyonOfficialSocialIntegrity,
  buildNelvyonOfficialSocialPackage,
  listNelvyonSocialAccountsChecklist,
} from "../NelvyonOfficialSocialPrep";

describe("NELVYON official social prep (own brand, staging only, NO publish/paid/oauth)", () => {
  it("checklist lists the exact 8 accounts Daniel must open/connect, all PENDING_CEO", () => {
    const checklist = listNelvyonSocialAccountsChecklist();
    expect(checklist).toHaveLength(8);
    expect(checklist.map((a) => a.platform)).toEqual([
      "tiktok",
      "instagram_posts",
      "facebook",
      "youtube_shorts",
      "linkedin",
      "x",
      "pinterest",
      "google_business_profile",
    ]);
    expect(checklist.every((a) => a.status === "PENDING_CEO")).toBe(true);
    expect(checklist.every((a) => a.requiredSecretsEnvVars.length > 0)).toBe(true);
    expect(checklist.every((a) => a.actionRequired.length > 10)).toBe(true);
    // Must never leak an actual secret value — only env var names (UPPER_SNAKE_CASE).
    for (const account of checklist) {
      for (const envVar of account.requiredSecretsEnvVars) {
        expect(envVar).toMatch(/^[A-Z0-9_]+$/);
      }
    }
  });

  it("builds an official NELVYON package with publish/oauth/paid/mass_dm all safe-off", () => {
    const pkg = buildNelvyonOfficialSocialPackage();
    expect(pkg.brand).toBe("NELVYON");
    expect(pkg.publish_authorized).toBe(false);
    expect(pkg.oauth_status).toBe("OFF");
    expect(pkg.paid_social_status).toBe("PREPARED_OFF");
    expect(pkg.mass_dm_forbidden).toBe(true);
    expect(pkg.accounts_checklist).toHaveLength(8);
    expect(pkg.strategy_monthly).toBeTruthy();
    expect(pkg.calendar).toBeTruthy();
    expect(pkg.copies).toBeTruthy();
    expect(pkg.qa_rubric).toBeTruthy();
    expect(pkg.analytics_plan).toBeTruthy();
  });

  it("passes its own integrity assertion", () => {
    expect(assertNelvyonOfficialSocialIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
