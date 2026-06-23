import { describe, expect, it } from "vitest";

import {
  buildParentComplement,
  buildDemoReportSections,
  enrichPackReportWithDemoContent,
  focusHighlightSectionIds,
} from "@/lib/packs/packDemoReportContent";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";

const localIntake = {
  business_name: "La Pizzería Napoli",
  sector: "restaurant" as const,
  city: "Madrid",
  value_proposition: "Pizza napolitana auténtica",
  primary_cta: "Reservar mesa",
  catalog_focus: "seo" as const,
};

describe("packDemoReportContent", () => {
  it("builds rich sections for local pack", () => {
    const sections = buildDemoReportSections(LOCAL_GROWTH_PACK_ID, localIntake);
    expect(sections.length).toBeGreaterThanOrEqual(4);
    const seo = sections.find((s) => s.id === "seo_local");
    expect(seo?.bullets.length).toBeGreaterThan(2);
    expect(seo?.recommendations.some((r) => r.priority === "high")).toBe(true);
  });

  it("adds parent complement when catalog_focus is seo", () => {
    const report = enrichPackReportWithDemoContent(
      {
        pack_name: "Pack Crecimiento Local",
        pack_id: LOCAL_GROWTH_PACK_ID,
        business_name: localIntake.business_name,
        sector: localIntake.sector,
        completed_at: new Date().toISOString(),
        summary: "test",
        kpis: {
          deliverables_published: 5,
          avg_qa_score: 90,
          skus_passed: 3,
          skus_total: 3,
          saas_client_id: 1,
          saas_campaign_id: 1,
        },
        sku_results: [],
        next_steps: [],
        portal_path: "/portal",
      },
      localIntake,
      "seo",
    );
    expect(report.parent_complement?.specialized_pack_name).toBe("Pack SEO Local");
    expect(report.parent_complement?.parent_pack_id).toBe(LOCAL_GROWTH_PACK_ID);
    expect(report.highlight_section_ids).toEqual(focusHighlightSectionIds("seo"));
  });

  it("buildParentComplement links meta to ecommerce parent", () => {
    const c = buildParentComplement("meta");
    expect(c.parent_pack_name).toContain("Ecommerce");
    expect(c.included_in_parent.some((i) => i.toLowerCase().includes("meta"))).toBe(true);
  });
});
