import { describe, expect, it } from "vitest";

import {
  buildEcommerceBrief,
  validateEcommerceGrowthIntake,
} from "@/lib/packs/ecommerceGrowthPack";
import {
  buildSaasB2bBrief,
  validateSaasB2bGrowthIntake,
} from "@/lib/packs/saasB2bGrowthPack";

describe("Ecommerce Growth Pack", () => {
  it("validates intake with product category", () => {
    const intake = validateEcommerceGrowthIntake({
      business_name: "Moda Nova",
      sector: "ecommerce",
      city: "Barcelona",
      value_proposition: "Moda sostenible premium",
      primary_cta: "Comprar ahora",
      product_category: "Moda femenina",
    });
    expect(intake?.product_category).toBe("Moda femenina");
  });

  it("builds ecommerce brief with meta template", () => {
    const brief = buildEcommerceBrief({
      business_name: "Moda Nova",
      sector: "ecommerce",
      city: "Barcelona",
      value_proposition: "Moda sostenible",
      primary_cta: "Comprar",
      product_category: "Moda",
    });
    expect(brief.sector).toBe("ecommerce");
    expect((brief.ecommerce as { template: string }).template).toBe("ads-meta-advantage-ecom-v1");
  });
});

describe("SaaS B2B Growth Pack", () => {
  it("validates intake with ICP", () => {
    const intake = validateSaasB2bGrowthIntake({
      business_name: "FlowMetrics",
      sector: "saas_b2b",
      city: "Madrid",
      value_proposition: "Analytics para equipos de producto",
      primary_cta: "Solicitar demo",
      icp_title: "VP Product en SaaS B2B",
    });
    expect(intake?.icp_title).toBe("VP Product en SaaS B2B");
  });

  it("builds saas b2b brief", () => {
    const brief = buildSaasB2bBrief({
      business_name: "FlowMetrics",
      sector: "saas_b2b",
      city: "Madrid",
      value_proposition: "Analytics PLG",
      primary_cta: "Demo",
      icp_title: "Head of Growth",
    });
    expect(brief.cta_type).toBe("demo_request");
    expect((brief.b2b as { icp_title: string }).icp_title).toBe("Head of Growth");
  });
});
