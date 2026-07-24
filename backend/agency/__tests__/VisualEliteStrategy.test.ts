import { afterEach, describe, expect, it } from "vitest";
import {
  VISUAL_ELITE_STRATEGY_FLOW,
  assertVisualEliteStrategyIntegrity,
  runVisualEliteStrategyPipeline,
  type VisualEliteBrief,
} from "../VisualEliteStrategyPipeline";
import {
  OffVisualGenerationProvider,
  isVisualGenerationSpendEnabled,
} from "../VisualGenerationProvider";

function baseBrief(overrides: Partial<VisualEliteBrief> = {}): VisualEliteBrief {
  return {
    workspaceId: 2,
    tenantId: "tenant-stg-a",
    clientName: "Café Norte",
    objective: "Lanzar reel de producto de temporada",
    sector: "hostelería",
    budgetCentsMax: 50_000,
    commercialUse: false,
    privacyOk: true,
    humanApprovalToken: "ceo-approval-token-1",
    ...overrides,
  };
}

describe("Visual elite strategy pipeline (ADR-051 extension, NO spend)", () => {
  afterEach(() => {
    delete process.env.NELVYON_VISUAL_GENERATION_ENABLED;
  });

  it("flow always includes creative direction right after brief, plus elite review + human approval before delivery", () => {
    expect(VISUAL_ELITE_STRATEGY_FLOW).toEqual([
      "brief",
      "creative_direction",
      "script",
      "storyboard",
      "prompts",
      "variants",
      "elite_visual_review",
      "human_approval",
      "delivery_package",
    ]);
    expect(assertVisualEliteStrategyIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("delivers a strategy_only package with 2+ variants and zero cost by default", async () => {
    expect(isVisualGenerationSpendEnabled()).toBe(false);
    const result = await runVisualEliteStrategyPipeline(baseBrief());

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("strategy_only");
    expect(result.creativeDirection.moodKeywords.length).toBeGreaterThan(0);
    expect(result.creativeDirection.visualDoNots.length).toBeGreaterThan(0);
    expect(result.variants.length).toBeGreaterThanOrEqual(2);
    expect(result.approvedVariantId).not.toBeNull();
    expect(result.render.costCents).toBe(0);
    expect(result.render.assetUrl).toBeNull();
    expect(result.gate.spendEnabled).toBe(false);
    expect(result.blockers).toEqual([]);
  });

  it("checks budgetCentsMax as a gate even in strategy mode", async () => {
    const result = await runVisualEliteStrategyPipeline(baseBrief({ budgetCentsMax: 0 }));
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("BUDGET_INVALID");
    expect(result.gate.budgetOk).toBe(false);
    expect(result.blockers).toContain("budget_invalid");
  });

  it("requires human approval before any delivery, strategy or render", async () => {
    const result = await runVisualEliteStrategyPipeline(baseBrief({ humanApprovalToken: undefined }));
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("MISSING_APPROVAL");
    expect(result.gate.humanApprovalGranted).toBe(false);
    expect(result.blockers).toContain("human_approval_required");
  });

  it("requires license + privacyOk for commercial-use packages", async () => {
    const missingLicense = await runVisualEliteStrategyPipeline(
      baseBrief({ commercialUse: true, license: undefined }),
    );
    expect(missingLicense.ok).toBe(false);
    expect(missingLicense.errorCode).toBe("COMMERCIAL_CONSENT_REQUIRED");

    const withLicense = await runVisualEliteStrategyPipeline(
      baseBrief({ commercialUse: true, license: "CC-cliente-2026", privacyOk: true }),
    );
    expect(withLicense.ok).toBe(true);
    expect(withLicense.gate.commercialUseOk).toBe(true);
  });

  it("elite visual review rejects false promises, off-brand and mediocre variants", async () => {
    const result = await runVisualEliteStrategyPipeline(
      baseBrief({
        variantPromptsOverride: [
          "Resultados garantizados 100% de venta sin esfuerzo, milagro instantáneo",
          "algo bonito",
          "Competidor Genérico S.A. sin mención de marca propia en absoluto aquí",
        ],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("ALL_VARIANTS_REJECTED");
    expect(result.approvedVariantId).toBeNull();
    expect(result.reviewedVariants.every((r) => !r.verdict.passed)).toBe(true);
    expect(
      result.reviewedVariants[0]!.verdict.rejections,
    ).toEqual(expect.arrayContaining(["false_promise"]));
    expect(
      result.reviewedVariants[2]!.verdict.rejections,
    ).toEqual(expect.arrayContaining(["brand_incoherence"]));
  });

  it("render_approved mode fails while spend flag is OFF, even with full approval", async () => {
    expect(isVisualGenerationSpendEnabled()).toBe(false);
    const result = await runVisualEliteStrategyPipeline(
      baseBrief({ requestRenderApproved: true }),
    );
    expect(result.ok).toBe(false);
    expect(result.mode).toBe("strategy_only");
    expect(result.render.requested).toBe(true);
    expect(result.render.ok).toBe(false);
    expect(result.render.errorCode).toBe("PROVIDER_OFF");
    expect(result.render.costCents).toBe(0);
    expect(result.render.assetUrl).toBeNull();
    expect(result.blockers).toContain("spend_disabled");
  });

  it("render_approved still requires human approval even if spend were ever enabled", async () => {
    process.env.NELVYON_VISUAL_GENERATION_ENABLED = "1";
    expect(isVisualGenerationSpendEnabled()).toBe(true);
    const result = await runVisualEliteStrategyPipeline(
      baseBrief({ requestRenderApproved: true, humanApprovalToken: undefined }),
    );
    expect(result.ok).toBe(false);
    expect(result.render.ok).toBe(false);
    expect(result.render.errorCode).toBe("MISSING_APPROVAL");
  });

  it("OffVisualGenerationProvider never spends even when flag toggled on without a real provider wired", async () => {
    process.env.NELVYON_VISUAL_GENERATION_ENABLED = "1";
    const provider = new OffVisualGenerationProvider();
    expect(provider.isEnabled()).toBe(false);
    const gen = await provider.generate({
      workspaceId: 2,
      tenantId: "t",
      kind: "image",
      prompt: "test",
      budgetCentsMax: 1000,
      commercialUse: false,
    });
    expect(gen.costCents).toBe(0);
    expect(gen.assetUrl).toBeNull();
    expect(gen.mode).toBe("strategy_only");
  });
});
