import { describe, expect, it } from "vitest";
import {
  SOCIAL_PLATFORM_SPECS,
  SOCIAL_PROFESSIONAL_ROLES,
  SOCIAL_SERVICE_FLOW,
  assertSocialNetworksIntegrity,
  assertSocialPublishAuthorized,
  buildSocialIntegralBundle,
  evaluateSocialQaElite,
  isPaidSocialEnabled,
} from "../OsSocialNetworksService";
import { getOsProfessionalTeam } from "../OsProfessionalTeams";

describe("OS Social Networks integral (ADR-052)", () => {
  it("catalog covers 11 platforms and 10 specialist roles", () => {
    expect(assertSocialNetworksIntegrity()).toEqual({ ok: true, violations: [] });
    expect(SOCIAL_PLATFORM_SPECS).toHaveLength(11);
    expect(SOCIAL_PROFESSIONAL_ROLES).toHaveLength(10);
    expect(SOCIAL_SERVICE_FLOW[0]).toBe("brief_and_brand");
    expect(SOCIAL_SERVICE_FLOW).toContain("authorized_schedule_or_publish");
  });

  it("svc_social_creative team has full specialist roster", () => {
    const team = getOsProfessionalTeam("svc_social_creative");
    expect(team?.title).toMatch(/Redes sociales/);
    expect(team?.roles.map((r) => r.roleId)).toEqual(
      expect.arrayContaining([
        "social_strategist",
        "paid_social",
        "community_manager",
        "social_qa_elite",
      ]),
    );
    expect(team?.roles).toHaveLength(10);
    const paid = team?.roles.find((r) => r.roleId === "paid_social");
    expect(paid?.forbidden).toEqual(expect.arrayContaining(["paid_spend", "oauth_connect"]));
  });

  it("builds integral bundle with paid/publish OFF and portal calendar", () => {
    const bundle = buildSocialIntegralBundle(
      {
        business_name: "Café Norte",
        sector: "local",
        city: "Madrid",
        value_proposition: "Café de especialidad",
        primary_cta: "Reservar mesa",
      },
      88,
    );
    expect(bundle.paid_social_status).toBe("PREPARED_OFF");
    expect(bundle.publish_status).toBe("NOT_AUTHORIZED");
    expect(bundle.oauth_status).toBe("OFF");
    expect(bundle.platforms.length).toBeGreaterThanOrEqual(7);
    expect((bundle.calendar as { portal_visible: boolean }).portal_visible).toBe(true);
    expect(bundle.qa_rubric.reject).toContain("platform_mismatch");
    expect(bundle.rollback).toContain("Keep paid_social PREPARED_OFF");
  });

  it("never authorizes publish by default; paid social flag OFF", () => {
    expect(assertSocialPublishAuthorized({}).ok).toBe(false);
    expect(assertSocialPublishAuthorized({ ceoPublishAuth: true }).code).toBe(
      "PUBLISH_DISABLED_DEFAULT",
    );
    const prev = process.env.NELVYON_PAID_SOCIAL_ENABLED;
    delete process.env.NELVYON_PAID_SOCIAL_ENABLED;
    expect(isPaidSocialEnabled()).toBe(false);
    if (prev === undefined) delete process.env.NELVYON_PAID_SOCIAL_ENABLED;
    else process.env.NELVYON_PAID_SOCIAL_ENABLED = prev;
  });

  it("elite social QA rejects off-brand and false promises", () => {
    const v = evaluateSocialQaElite({
      score: 95,
      offBrand: true,
      falsePromise: true,
    });
    expect(v.passed).toBe(false);
    expect(v.rejections).toEqual(
      expect.arrayContaining(["brand_incoherence", "false_promise"]),
    );
  });
});
