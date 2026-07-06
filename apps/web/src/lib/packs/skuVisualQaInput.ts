import type { VisualQaInput } from "../../../../../backend/autonomous/qa/visualQaEngine";
import type { AutonomousSku, SimulationResult } from "../../../../../backend/autonomous/types";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/** Build visual QA input from real Phase C artifacts — not intake-only stubs. */
export function buildSkuVisualQaInput(
  sku: AutonomousSku,
  simulation: SimulationResult,
  intake: Record<string, unknown>,
): VisualQaInput {
  const base: VisualQaInput = {
    brandColor: "#0084ff",
    backgroundColor: "#020817",
    copyText: [intake.value_proposition, intake.primary_cta].filter(Boolean).join(" "),
  };

  if (sku !== "NELVYON-LANDING") {
    return base;
  }

  const copy = simulation.project.artifacts?.copy as Record<string, unknown> | undefined;
  const hero = copy?.hero as { headline?: string; cta_label?: string; subheadline?: string } | undefined;
  const meta = copy?.meta as { description?: string; title?: string } | undefined;
  const headline = hero?.headline ?? String(intake.business_name ?? intake.company_name ?? "");
  const cta = hero?.cta_label ?? String(intake.primary_cta ?? "Contactar");
  const description = meta?.description ?? String(intake.value_proposition ?? "");
  const sub = hero?.subheadline ?? "";

  const landingHtml = `<!DOCTYPE html><html><head><meta name="description" content="${escapeHtml(description)}"></head><body><h1>${escapeHtml(headline)}</h1><p>${escapeHtml(sub)}</p><button>${escapeHtml(cta)}</button></body></html>`;

  return { ...base, landingHtml };
}

/** Soft review: visual score threshold applies only to landing SKU (structural QA). */
export function skuNeedsSoftReview(result: {
  sku: string;
  qa_visual_score?: number;
  qa_legal_passed?: boolean;
  qa_gate_status?: string;
  shield_status?: string;
  truth_status?: string;
}): boolean {
  if (result.qa_legal_passed === false) return true;
  if (result.qa_gate_status === "blocked") return true;
  if (result.shield_status === "blocked") return true;
  if (result.truth_status === "blocked") return true;
  if (
    result.sku === "NELVYON-LANDING" &&
    result.qa_visual_score !== undefined &&
    result.qa_visual_score < 70
  ) {
    return true;
  }
  return false;
}
