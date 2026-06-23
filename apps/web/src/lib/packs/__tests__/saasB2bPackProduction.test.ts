import { describe, expect, it } from "vitest";

import {
  buildNurtureEmailSequence,
  enrichSaasB2bIntake,
  resolveSaasLandingLiveUrl,
  SAAS_B2B_PACK_CATALOG_TITLES,
  slugFromBusinessName,
} from "@/lib/packs/saasB2bPackProduction";
import { containsMockUrl } from "@/lib/packs/localPackProduction";

describe("saasB2bPackProduction", () => {
  const intake = {
    business_name: "FlowMetrics QA",
    sector: "saas_b2b" as const,
    city: "Madrid",
    value_proposition: "Analytics PLG para producto",
    primary_cta: "Solicitar demo",
    icp_title: "VP Product",
    contact_email: "portal-saas-qa@nelvyon.test",
    contact_name: "Ana QA",
  };

  it("builds landing slug and hosted URL", () => {
    const enriched = enrichSaasB2bIntake(intake);
    expect(enriched.landing_slug).toBe("flowmetrics-qa");
    const url = resolveSaasLandingLiveUrl(enriched, enriched.landing_slug, "https://staging.example.com");
    expect(url).toBe("https://staging.example.com/api/packs/saas-b2b/live/flowmetrics-qa");
    expect(containsMockUrl(url)).toBe(false);
  });

  it("creates 5-touch nurture sequence", () => {
    const touches = buildNurtureEmailSequence(intake);
    expect(touches).toHaveLength(5);
    expect(touches[0].touch).toBe(1);
  });

  it("exposes 6 catalog titles for portal", () => {
    expect(SAAS_B2B_PACK_CATALOG_TITLES).toEqual([
      "Landing product-led",
      "SEO demand gen",
      "Bot de demo / calificación",
      "Secuencia nurture B2B",
      "Playbook outbound / ABM",
      "Informe ejecutivo",
    ]);
    expect(slugFromBusinessName(intake.business_name)).toBe("flowmetrics-qa");
  });
});
