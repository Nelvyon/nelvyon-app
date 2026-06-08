/** Phase M — portal approve/reject → template_outcomes (DB or local fallback) */

import type { TemplateCategory } from "../templates/types";
import {
  learningDbEnabled,
  resolveStorageMode,
  templateOutcomeRepository,
  type RecordOutcomeInput,
} from "../templates/templateOutcomeRepository";
import { resolveConversionMetrics } from "./conversionMetricsPlaceholder";

export type PortalReviewDecision = "approve" | "reject";

export interface AutonomousDeliverableMetadata {
  autonomous_provenance?: boolean;
  template_id?: string;
  sector?: string;
  sku?: string;
  qa_score?: number;
  autonomous_project_id?: string;
  autonomous_job_id?: string;
  client_review_history?: Array<{ decision?: string }>;
  artifacts?: {
    plan?: { template_id?: string };
    template_pipeline?: { selected_template_id?: string };
  };
}

export interface PortalDeliverableLike {
  id: string;
  workspace_id?: number | null;
  deliverable_metadata?: AutonomousDeliverableMetadata | Record<string, unknown> | null;
}

const SKU_CONTEXT: Record<string, { category: TemplateCategory; service: string }> = {
  landing: { category: "landing", service: "landing" },
  "NELVYON-LANDING": { category: "landing", service: "landing" },
  chatbot: { category: "chatbot", service: "chatbot" },
  "NELVYON-CHATBOT": { category: "chatbot", service: "chatbot" },
  seo: { category: "landing", service: "landing" },
  "NELVYON-SEO": { category: "landing", service: "landing" },
};

export function hasAutonomousProvenance(metadata: unknown): metadata is AutonomousDeliverableMetadata {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as AutonomousDeliverableMetadata).autonomous_provenance === true;
}

export function resolveTemplateIdFromMetadata(meta: AutonomousDeliverableMetadata): string | null {
  if (typeof meta.template_id === "string" && meta.template_id.trim()) {
    return meta.template_id.trim();
  }
  const fromPlan = meta.artifacts?.plan?.template_id;
  if (typeof fromPlan === "string" && fromPlan.trim()) return fromPlan.trim();
  const fromPipeline = meta.artifacts?.template_pipeline?.selected_template_id;
  if (typeof fromPipeline === "string" && fromPipeline.trim()) return fromPipeline.trim();
  return null;
}

export function resolveSkuContext(sku: string | undefined): { category: TemplateCategory; service: string } {
  const key = (sku ?? "landing").trim();
  return SKU_CONTEXT[key] ?? SKU_CONTEXT.landing;
}

export function countPortalRevisions(meta: AutonomousDeliverableMetadata): number {
  const history = meta.client_review_history;
  if (!Array.isArray(history)) return 0;
  return history.filter((h) => h.decision === "reject").length;
}

export function buildPortalOutcomeInput(
  deliverable: PortalDeliverableLike,
  decision: PortalReviewDecision,
): RecordOutcomeInput | null {
  const raw = deliverable.deliverable_metadata;
  if (!hasAutonomousProvenance(raw)) return null;

  const templateId = resolveTemplateIdFromMetadata(raw);
  if (!templateId) return null;

  const ctx = resolveSkuContext(raw.sku);
  const sector = String(raw.sector ?? "general");
  const revisions = countPortalRevisions(raw);
  const conversion = resolveConversionMetrics({
    deliverable_id: deliverable.id,
    sector,
  });

  const approved = decision === "approve";

  return {
    workspace_id: deliverable.workspace_id ?? null,
    template_id: templateId,
    category: ctx.category,
    sector,
    service: ctx.service,
    objective: "lead_gen",
    channel: "web",
    language: "es",
    level: "professional",
    qa_score: typeof raw.qa_score === "number" ? raw.qa_score : null,
    approved_by_client: approved,
    revisions_count: approved ? revisions : Math.max(revisions, 1),
    conversion_rate: conversion.conversion_rate,
    lead_count: conversion.lead_count,
    client_rating: null,
    delivery_time_hours: null,
    result_status: approved ? "client_approved" : "client_rejected",
    notes: `Portal ${decision} — Phase M learning loop`,
    metadata: {
      project_ref: raw.autonomous_project_id ?? deliverable.id,
      deliverable_id: deliverable.id,
      autonomous_job_id: raw.autonomous_job_id ?? null,
      portal_decision: decision,
      conversion_source: conversion.source,
      phase: "M",
    },
  };
}

export interface PortalLearningRecordResult {
  recorded: boolean;
  mode: "db" | "local" | "skipped";
  id?: string;
  reason?: string;
}

export async function recordPortalLearningOutcome(
  deliverable: PortalDeliverableLike,
  decision: PortalReviewDecision,
): Promise<PortalLearningRecordResult> {
  const input = buildPortalOutcomeInput(deliverable, decision);
  if (!input) {
    return { recorded: false, mode: "skipped", reason: "not_autonomous_or_missing_template" };
  }

  try {
    const { id, mode } = await templateOutcomeRepository.recordOutcome(input);
    return { recorded: true, mode, id };
  } catch {
    if (!learningDbEnabled() && resolveStorageMode() === "local") {
      return { recorded: false, mode: "skipped", reason: "local_write_failed" };
    }
    return { recorded: false, mode: "skipped", reason: "record_failed" };
  }
}
