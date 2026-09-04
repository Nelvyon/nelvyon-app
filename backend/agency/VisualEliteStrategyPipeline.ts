/**
 * Visual elite strategy pipeline (ADR-051 extension, ADR-055 closure).
 * Flow: brief → creative_direction → script → storyboard → prompts → variants (2+)
 *       → elite visual review → human approval required → delivery package
 *       (strategy_only by default).
 *
 * NO spend by default: `NELVYON_VISUAL_GENERATION_ENABLED` stays OFF; `render_approved`
 * mode is only reachable when the flag is explicitly ON (never set in this repo) AND every
 * control gate (budget, commercial consent, license, privacy, human approval) passes.
 * Never integrates a paid visual vendor — actual generation is delegated to the existing
 * `VisualGenerationProvider` contract, whose default implementation never spends.
 */

import { evaluateEliteQa, type QaEliteVerdict } from "./OsEliteQaPolicy";
import {
  getVisualGenerationProvider,
  isVisualGenerationSpendEnabled,
  type VisualGenerationResult,
} from "./VisualGenerationProvider";
import type { BriefVisual } from "./briefVisual";

export const VISUAL_ELITE_STRATEGY_FLOW = [
  "brief",
  "creative_direction",
  "script",
  "storyboard",
  "prompts",
  "variants",
  "elite_visual_review",
  "human_approval",
  "delivery_package",
] as const;

export type VisualEliteBrief = {
  workspaceId: number;
  tenantId: string;
  clientName: string;
  objective: string;
  sector: string;
  /** Budget gate metadata — checked even in strategy_only mode, never bypassed. */
  budgetCentsMax: number;
  commercialUse: boolean;
  privacyOk: boolean;
  license?: string;
  humanApprovalToken?: string;
  /** Explicit request to attempt paid render — still fails while spend flag is OFF. */
  requestRenderApproved?: boolean;
  /** Test/QA only — inject specific prompts to exercise the elite review reject paths. */
  variantPromptsOverride?: string[];
  /**
   * Lo que NELVYON sabe del aspecto de esta marca.
   *
   * Es opcional para no romper a quien ya construye briefs, pero SIN esto la
   * direccion creativa es la misma para todos: la version anterior devolvia
   * «autentico, profesional, cercano» mas el sector, para cualquier cliente.
   * Eso es literalmente lo generico que este sistema existe para evitar.
   */
  visual?: BriefVisual;
};

export type VisualEliteVariant = {
  variantId: string;
  prompt: string;
  rationale: string;
};

export type VisualEliteReviewedVariant = {
  variant: VisualEliteVariant;
  verdict: QaEliteVerdict;
};

export type VisualEliteGate = {
  budgetCentsMax: number;
  budgetOk: boolean;
  commercialUse: boolean;
  commercialUseOk: boolean;
  privacyOk: boolean;
  license: string | null;
  humanApprovalRequired: true;
  humanApprovalGranted: boolean;
  spendEnabled: boolean;
};

export type VisualEliteRenderOutcome = {
  requested: boolean;
  ok: boolean;
  mode: "off" | "strategy_only" | "render_approved";
  errorCode?: VisualGenerationResult["errorCode"] | "MISSING_APPROVAL" | "GATE_FAILED";
  costCents: number;
  assetUrl: string | null;
  license: string | null;
};

export type VisualEliteCreativeDirection = {
  moodKeywords: string[];
  colorDirection: string;
  toneOfVoice: string;
  visualDoNots: string[];
};

export type VisualEliteDeliveryResult = {
  ok: boolean;
  mode: "strategy_only" | "render_approved";
  flow: typeof VISUAL_ELITE_STRATEGY_FLOW;
  creativeDirection: VisualEliteCreativeDirection;
  script: string;
  storyboard: string[];
  prompts: string[];
  variants: VisualEliteVariant[];
  reviewedVariants: VisualEliteReviewedVariant[];
  approvedVariantId: string | null;
  gate: VisualEliteGate;
  render: VisualEliteRenderOutcome;
  blockers: string[];
  errorCode?: "MISSING_APPROVAL" | "ALL_VARIANTS_REJECTED" | "BUDGET_INVALID" | "COMMERCIAL_CONSENT_REQUIRED";
};

const FALSE_PROMISE_PATTERNS: readonly RegExp[] = [
  /garantiz/i,
  /100\s*%\s*result/i,
  /milagr/i,
  /sin\s+esfuerzo/i,
  /resultados?\s+inmediatos?/i,
  /nunca\s+falla/i,
];

const MEDIOCRE_PATTERNS: readonly RegExp[] = [
  /algo\s+bonito/i,
  /cosas?\s+geniales?/i,
  /contenido\s+gen[eé]rico/i,
];

const STORYBOARD_SCENES = ["hook", "problema", "solucion", "cta"] as const;

/**
 * Creative direction step — runs right after the brief and before script/storyboard,
 * so every downstream prompt/variant is anchored to an explicit mood/tone/color
 * direction instead of being improvised ad hoc per variant.
 */
/**
 * Lo que no se puede hacer NUNCA, venga el brief que venga.
 *
 * No es la lista de la marca: es la de la agencia. Una foto de stock generica
 * o una promesa de resultado garantizado estan mal para cualquier cliente, y a
 * las suyas se anaden, no se sustituyen.
 */
const NUNCA: readonly string[] = [
  "stock photos genéricas",
  "promesas de resultado garantizado",
  "texto ilegible en móvil",
];

/**
 * La direccion creativa, sacada de la marca y no de una plantilla.
 *
 * ANTES devolvia las mismas cuatro palabras para todos —«autentico,
 * profesional, cercano» mas el sector—. Dos clientes que no se parecen en nada
 * recibian la misma direccion, y eso no es una direccion: es un relleno con
 * forma de decision.
 *
 * Ahora, lo que no consta NO se rellena: si no sabemos como habla la marca, el
 * tono queda declarado como desconocido en vez de inventado.
 */
function buildCreativeDirection(brief: VisualEliteBrief): VisualEliteCreativeDirection {
  const v = brief.visual;

  // El sector siempre entra; el resto solo si consta.
  const mood = [brief.sector.trim().toLowerCase()].filter(Boolean);
  if (v?.diferenciacion) mood.push(...palabrasClave(v.diferenciacion));
  if (v?.publico) mood.push(...palabrasClave(v.publico));
  if (v?.dondeSeVaAVer?.length) mood.push(...v.dondeSeVaAVer.slice(0, 2));

  return {
    moodKeywords: mood.length > 0 ? [...new Set(mood)].slice(0, 8) : ["sin dirección declarada"],
    colorDirection: v?.marca
      ? `Identidad del cliente: ${v.marca}. Contraste alto para móvil.`
      : "No consta la identidad visual del cliente: NO se inventa una paleta.",
    toneOfVoice: v?.vozDeMarca ?? "No consta cómo habla esta marca: no se supone un tono.",
    // Las prohibiciones de la marca se SUMAN a las de la agencia. Quitar las
    // suyas porque el cliente tenga las propias seria perder las dos.
    visualDoNots: [...NUNCA, ...(v?.loQueNoHace ?? [])],
  };
}

/** Las palabras con peso de una frase, para la lista de mood. */
function palabrasClave(frase: string): string[] {
  return frase
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 5)
    .slice(0, 3);
}

function buildScript(brief: VisualEliteBrief): string {
  return `${brief.clientName} — ${brief.objective}. Sector: ${brief.sector}.`.slice(0, 500);
}

function buildStoryboard(): string[] {
  return [...STORYBOARD_SCENES];
}

function buildPrompts(brief: VisualEliteBrief, storyboard: string[]): string[] {
  return storyboard.map((scene) => `${scene}: ${brief.objective} (${brief.clientName})`);
}

function buildVariants(brief: VisualEliteBrief): VisualEliteVariant[] {
  if (brief.variantPromptsOverride?.length) {
    return brief.variantPromptsOverride.map((prompt, i) => ({
      variantId: `v${i + 1}`,
      prompt,
      rationale: "test_override",
    }));
  }
  const v = brief.visual;
  // Lo que distingue a ESTE cliente. Sin ello las dos variantes son la misma
  // frase con otro nombre delante.
  const angulo = v?.diferenciacion ? ` Diferencial: ${v.diferenciacion}.` : "";
  const aQuien = v?.publico ? ` Para: ${v.publico}.` : "";
  const donde = v?.dondeSeVaAVer?.length ? ` Se verá en: ${v.dondeSeVaAVer.join(", ")}.` : "";

  return [
    {
      variantId: "v1",
      prompt: `${brief.clientName}: ${brief.objective} — prueba social real, hook auténtico, CTA claro para ${brief.sector}.${angulo}${aQuien}`,
      rationale: "Ángulo prueba social",
    },
    {
      variantId: "v2",
      prompt: `${brief.clientName}: ${brief.objective} — transformación honesta antes/después, sin promesas absolutas, para ${brief.sector}.${donde}`,
      rationale: "Ángulo transformación honesta",
    },
  ];
}

function reviewVariant(variant: VisualEliteVariant, brief: VisualEliteBrief): QaEliteVerdict {
  const text = variant.prompt;
  const falsePromise = FALSE_PROMISE_PATTERNS.some((re) => re.test(text));
  const mediocre = MEDIOCRE_PATTERNS.some((re) => re.test(text)) || text.trim().length < 30;
  const offBrand = !text.toLowerCase().includes(brief.clientName.trim().toLowerCase());

  let score = 94;
  if (falsePromise) score -= 35;
  if (mediocre) score -= 25;
  if (offBrand) score -= 20;
  score = Math.max(0, Math.min(100, score));

  return evaluateEliteQa({
    score,
    critical: true,
    flags: {
      false_promise: falsePromise,
      brand_incoherence: offBrand,
      visual_defect: mediocre,
    },
  });
}

/**
 * Runs the full elite strategy flow. Never spends; delegates any paid render
 * attempt to `VisualGenerationProvider`, which defaults to strategy_only, cost 0.
 */
export async function runVisualEliteStrategyPipeline(
  brief: VisualEliteBrief,
): Promise<VisualEliteDeliveryResult> {
  const blockers: string[] = [];
  const creativeDirection = buildCreativeDirection(brief);
  const script = buildScript(brief);
  const storyboard = buildStoryboard();
  const prompts = buildPrompts(brief, storyboard);
  const variants = buildVariants(brief);

  const reviewedVariants: VisualEliteReviewedVariant[] = variants.map((variant) => ({
    variant,
    verdict: reviewVariant(variant, brief),
  }));

  const approved = reviewedVariants.find((r) => r.verdict.passed) ?? null;

  const budgetOk = Number.isFinite(brief.budgetCentsMax) && brief.budgetCentsMax > 0;
  const commercialUseOk = !brief.commercialUse || (Boolean(brief.license?.trim()) && brief.privacyOk === true);
  const humanApprovalGranted = Boolean(brief.humanApprovalToken?.trim());
  const spendEnabled = isVisualGenerationSpendEnabled();

  const gate: VisualEliteGate = {
    budgetCentsMax: brief.budgetCentsMax,
    budgetOk,
    commercialUse: brief.commercialUse,
    commercialUseOk,
    privacyOk: brief.privacyOk,
    license: brief.license?.trim() || null,
    humanApprovalRequired: true,
    humanApprovalGranted,
    spendEnabled,
  };

  if (!approved) blockers.push("all_variants_rejected");
  if (!budgetOk) blockers.push("budget_invalid");
  if (!commercialUseOk) blockers.push("commercial_use_requires_license_and_privacy_ok");
  if (!humanApprovalGranted) blockers.push("human_approval_required");

  const strategyReady = Boolean(approved) && budgetOk && commercialUseOk && humanApprovalGranted;

  let render: VisualEliteRenderOutcome = {
    requested: Boolean(brief.requestRenderApproved),
    ok: false,
    mode: "strategy_only",
    costCents: 0,
    assetUrl: null,
    license: gate.license,
  };

  if (brief.requestRenderApproved) {
    if (!strategyReady) {
      render = {
        ...render,
        errorCode: !humanApprovalGranted ? "MISSING_APPROVAL" : "GATE_FAILED",
      };
    } else if (!spendEnabled) {
      blockers.push("spend_disabled");
      render = { ...render, errorCode: "PROVIDER_OFF" };
    } else {
      const provider = getVisualGenerationProvider();
      const genResult = await provider.generate({
        workspaceId: brief.workspaceId,
        tenantId: brief.tenantId,
        kind: "image",
        prompt: approved!.variant.prompt,
        budgetCentsMax: brief.budgetCentsMax,
        humanApprovalToken: brief.humanApprovalToken,
        commercialUse: brief.commercialUse,
      });
      render = {
        requested: true,
        ok: genResult.ok && genResult.mode === "render_approved",
        mode: genResult.mode,
        errorCode: genResult.errorCode,
        costCents: genResult.costCents,
        assetUrl: genResult.assetUrl,
        license: genResult.license ?? gate.license,
      };
      if (!render.ok) blockers.push("provider_did_not_render");
    }
  }

  // Overall success: if a render was explicitly requested, the outcome is judged on
  // whether that render was actually achieved (fails while spend flag OFF, by design).
  const ok = brief.requestRenderApproved ? render.ok : strategyReady;
  const mode: "strategy_only" | "render_approved" = render.mode === "render_approved" ? "render_approved" : "strategy_only";

  let errorCode: VisualEliteDeliveryResult["errorCode"];
  if (!humanApprovalGranted) errorCode = "MISSING_APPROVAL";
  else if (!approved) errorCode = "ALL_VARIANTS_REJECTED";
  else if (!budgetOk) errorCode = "BUDGET_INVALID";
  else if (!commercialUseOk) errorCode = "COMMERCIAL_CONSENT_REQUIRED";

  return {
    ok,
    mode,
    flow: VISUAL_ELITE_STRATEGY_FLOW,
    creativeDirection,
    script,
    storyboard,
    prompts,
    variants,
    reviewedVariants,
    approvedVariantId: approved?.variant.variantId ?? null,
    gate,
    render,
    blockers: [...new Set(blockers)],
    errorCode,
  };
}

export function assertVisualEliteStrategyIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (isVisualGenerationSpendEnabled()) {
    violations.push("spend_flag_must_be_off_in_repo_default");
  }
  if (VISUAL_ELITE_STRATEGY_FLOW.length < 9) violations.push("flow_incomplete");
  if (!VISUAL_ELITE_STRATEGY_FLOW.includes("human_approval")) violations.push("missing_human_approval_step");
  if (!VISUAL_ELITE_STRATEGY_FLOW.includes("elite_visual_review")) violations.push("missing_elite_review_step");
  if (!VISUAL_ELITE_STRATEGY_FLOW.includes("creative_direction")) violations.push("missing_creative_direction_step");
  if (VISUAL_ELITE_STRATEGY_FLOW.indexOf("creative_direction") !== VISUAL_ELITE_STRATEGY_FLOW.indexOf("brief") + 1) {
    violations.push("creative_direction_must_follow_brief");
  }
  return { ok: violations.length === 0, violations };
}
