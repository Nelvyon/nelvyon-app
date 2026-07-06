import { describe, expect, it } from "vitest";

import { buildSkuVisualQaInput, skuNeedsSoftReview } from "@/lib/packs/skuVisualQaInput";
import { runVisualQa } from "../../../../../../backend/autonomous/qa/visualQaEngine";

describe("buildSkuVisualQaInput", () => {
  const intake = {
    business_name: "QA Local Test",
    value_proposition: "Cocina mediterránea de autor en el centro",
    primary_cta: "Reservar mesa",
  };

  const simulation = {
    project: {
      artifacts: {
        copy: {
          hero: {
            headline: "QA Local Test: Cocina mediterránea",
            cta_label: "Reservar mesa",
            subheadline: "Solución profesional en restaurant.",
          },
          meta: { description: "Cocina mediterránea de autor en el centro" },
        },
      },
    },
  } as never;

  it("landing SKU includes structural HTML from artifacts", () => {
    const input = buildSkuVisualQaInput("NELVYON-LANDING", simulation, intake);
    expect(input.landingHtml).toContain("<h1>");
    expect(input.landingHtml).toContain("Reservar mesa");
    const qa = runVisualQa(input);
    expect(qa.score).toBeGreaterThanOrEqual(70);
    expect(qa.checks.has_h1).toBe(true);
    expect(qa.checks.has_cta).toBe(true);
  });

  it("non-landing SKU omits landingHtml", () => {
    const input = buildSkuVisualQaInput("NELVYON-SEO", simulation, intake);
    expect(input.landingHtml).toBeUndefined();
  });
});

describe("skuNeedsSoftReview", () => {
  it("does not soft-review SEO SKU with low visual-only score", () => {
    expect(
      skuNeedsSoftReview({
        sku: "NELVYON-SEO",
        qa_visual_score: 60,
        qa_legal_passed: true,
      }),
    ).toBe(false);
  });

  it("soft-reviews landing SKU when visual score < 70", () => {
    expect(
      skuNeedsSoftReview({
        sku: "NELVYON-LANDING",
        qa_visual_score: 60,
        qa_legal_passed: true,
      }),
    ).toBe(true);
  });

  it("soft-reviews when legal fails on any SKU", () => {
    expect(
      skuNeedsSoftReview({
        sku: "NELVYON-CHATBOT",
        qa_visual_score: 95,
        qa_legal_passed: false,
      }),
    ).toBe(true);
  });
});
