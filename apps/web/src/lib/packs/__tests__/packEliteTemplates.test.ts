import { describe, expect, it } from "vitest";

import {
  applyEliteTemplatesToBrief,
  getPackFeaturedPreset,
  getPackTemplateGallery,
  resolveTemplatesForSector,
} from "@/lib/packs/packEliteTemplates";
import {
  ECOMMERCE_GROWTH_PACK_ID,
  LOCAL_GROWTH_PACK_ID,
  SAAS_B2B_GROWTH_PACK_ID,
} from "@/lib/packs/types";

describe("packEliteTemplates", () => {
  it("returns featured preset per pack with intake", () => {
    const local = getPackFeaturedPreset(LOCAL_GROWTH_PACK_ID);
    expect(local.intake.business_name).toBe("Restaurante La Plaza");
    expect(local.templates.landing_template_id).toBe("landing-cro-v3");

    const ecom = getPackFeaturedPreset(ECOMMERCE_GROWTH_PACK_ID);
    expect(ecom.intake.product_category).toBe("Moda femenina");
    expect(ecom.templates.ads_template_id).toBe("ads-meta-advantage-ecom-v1");

    const saas = getPackFeaturedPreset(SAAS_B2B_GROWTH_PACK_ID);
    expect(saas.intake.icp_title).toContain("VP Product");
    expect(saas.templates.funnel_template_id).toBe("funnel-ads-landing-crm-v1");
  });

  it("enriches brief with elite template bundle", () => {
    const bundle = resolveTemplatesForSector("dental");
    const brief = applyEliteTemplatesToBrief({ company_name: "Test" }, bundle);
    expect(brief.template_id).toBe("landing-hero-split");
    expect(brief.flow_template_id).toBe("chatbot-appointment-v1");
    expect((brief.elite_templates as { seo_template_id: string }).seo_template_id).toBe(
      "seo-premium-local-v1",
    );
  });

  it("gallery has preview paths for each pack", () => {
    for (const packId of [
      LOCAL_GROWTH_PACK_ID,
      ECOMMERCE_GROWTH_PACK_ID,
      SAAS_B2B_GROWTH_PACK_ID,
    ]) {
      const gallery = getPackTemplateGallery(packId);
      expect(gallery.length).toBeGreaterThanOrEqual(4);
      expect(gallery.every((g) => g.previewPath.startsWith("/"))).toBe(true);
    }
  });
});
