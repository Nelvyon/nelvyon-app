/** Learning events — isolated ingestion from Phase H/I outputs (no DB) */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { normalizeOutcome } from "./templateOutcome";
import type { LearningEvent, TemplateCategory, TemplateOutcome } from "./types";

function readJsonIfExists<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function combinedQaScore(qaReport: Record<string, unknown>): number {
  const offline = Number(qaReport.offline_score ?? qaReport.score ?? 0);
  const pw = Number(qaReport.playwright_score ?? qaReport.staging_score ?? offline);
  if (offline > 0 && pw > 0) return Math.round((offline + pw) / 2);
  return Math.round(Math.max(offline, pw));
}

function normalizeTemplateId(id: string): string {
  if (id === "landing-cro-v1" || id === "landing-cro-v3-local") return "landing-cro-v3";
  if (id.startsWith("landing-cro")) return "landing-cro-v3";
  return id;
}

function resolveTemplateId(
  previewMeta: Record<string, unknown> | null,
  artifacts: Record<string, unknown> | null,
): string {
  const sectorTemplates = (artifacts?.sector_context as Record<string, unknown> | undefined)?.templates;
  if (Array.isArray(sectorTemplates) && typeof sectorTemplates[0] === "string") {
    return normalizeTemplateId(sectorTemplates[0] as string);
  }
  const fromPlan = artifacts?.plan as Record<string, unknown> | undefined;
  if (typeof fromPlan?.template_id === "string") {
    return normalizeTemplateId(fromPlan.template_id);
  }
  if (previewMeta?.template_category === "restaurante") return "landing-cro-v3";
  return "landing-cro-v3";
}

export function ingestPhaseHOutput(outputDir: string): { events: LearningEvent[]; outcome: TemplateOutcome | null } {
  const events: LearningEvent[] = [];
  const now = new Date().toISOString();
  const projectRef = outputDir.split(/[/\\]/).slice(-2).join("/");

  const qaReport = readJsonIfExists<Record<string, unknown>>(join(outputDir, "qaReport.json"));
  const previewMeta = readJsonIfExists<Record<string, unknown>>(join(outputDir, "previewMetadata.json"));
  const osPublish = readJsonIfExists<Record<string, unknown>>(join(outputDir, "osPublishPayload.json"));
  const artifacts = readJsonIfExists<Record<string, unknown>>(
    join(outputDir, "phase-c", "landing", "artifacts.json"),
  );

  const sector = String(osPublish?.sector ?? previewMeta?.template_category ?? "restaurant");
  const normalizedSector = sector === "restaurante" ? "restaurant" : sector;
  const templateId = resolveTemplateId(previewMeta, artifacts);
  const qaScore = qaReport ? combinedQaScore(qaReport) : 0;

  events.push({
    type: "landing_generated",
    at: String(previewMeta?.generated_at ?? now),
    project_ref: projectRef,
    template_id: templateId,
    sector: normalizedSector,
    category: "landing",
    payload: { phase: "H", block_count: previewMeta?.block_count },
  });

  if (existsSync(join(outputDir, "preview.html"))) {
    events.push({
      type: "preview_generated",
      at: String(previewMeta?.generated_at ?? now),
      project_ref: projectRef,
      template_id: templateId,
      sector: normalizedSector,
      category: "landing",
      payload: { staging_only: previewMeta?.staging_only ?? true },
    });
  }

  if (qaReport) {
    events.push({
      type: "qa_completed",
      at: now,
      project_ref: projectRef,
      template_id: templateId,
      sector: normalizedSector,
      category: "landing",
      payload: {
        qa_score: qaScore,
        playwright_passed: qaReport.playwright_passed ?? true,
        blocking_failures: qaReport.blocking_failures ?? [],
      },
    });
  }

  if (osPublish) {
    events.push({
      type: "os_publish_dry_run",
      at: now,
      project_ref: projectRef,
      template_id: templateId,
      sector: normalizedSector,
      category: "landing",
      payload: {
        dry_run: osPublish.dry_run ?? true,
        qa_score: osPublish.qa_score ?? qaScore,
        project_id: osPublish.project_id,
      },
    });
  }

  let outcome: TemplateOutcome | null = null;
  if (qaReport || osPublish) {
    outcome = normalizeOutcome({
      id: `phase-h-${projectRef}`,
      project_ref: projectRef,
      template_id: templateId,
      category: "landing",
      sector: normalizedSector,
      service: "landing",
      objective: "booking",
      channel: "web",
      language: "es",
      level: "professional",
      qa_score: qaScore || Number(osPublish?.qa_score ?? 0),
      approved_by_client: false,
      revisions_count: 0,
      conversion_rate: null,
      lead_count: 0,
      client_rating: null,
      delivery_time_hours: 4,
      result_status: qaScore >= 85 ? "qa_passed" : "qa_failed",
      notes: "Ingested from Phase H output (isolated)",
      created_at: now,
    });
  }

  return { events, outcome };
}

export function ingestPhaseIOutput(outputDir: string): { events: LearningEvent[]; outcome: TemplateOutcome | null } {
  const base = ingestPhaseHOutput(outputDir);
  const deployMeta = readJsonIfExists<Record<string, unknown>>(join(outputDir, "deploy_metadata.json"));

  if (deployMeta) {
    base.events.push({
      type: "preview_generated",
      at: String(deployMeta.deployed_at ?? new Date().toISOString()),
      project_ref: base.events[0]?.project_ref ?? "phase-i",
      template_id: base.events[0]?.template_id ?? "landing-cro-v3",
      sector: base.events[0]?.sector ?? "restaurant",
      category: "landing",
      payload: {
        phase: "I",
        staging_url: deployMeta.staging_url,
        mock: deployMeta.mock ?? true,
      },
    });
  }

  if (base.outcome) {
    base.outcome = normalizeOutcome({
      ...base.outcome,
      id: `phase-i-${base.outcome.project_ref}`,
      result_status: "published_internal",
      notes: "Phase I staging deploy (dry-run / mock)",
    });
  }

  return base;
}

export function mergeOutcomes(
  mockOutcomes: TemplateOutcome[],
  phaseOutcomes: Array<TemplateOutcome | null>,
): TemplateOutcome[] {
  const byKey = new Map<string, TemplateOutcome>();
  for (const o of mockOutcomes) {
    byKey.set(`${o.project_ref}:${o.template_id}`, o);
  }
  for (const o of phaseOutcomes) {
    if (!o) continue;
    byKey.set(`${o.project_ref}:${o.template_id}`, o);
  }
  return [...byKey.values()];
}

export function applyClientEvent(
  outcomes: TemplateOutcome[],
  event: LearningEvent,
): TemplateOutcome[] {
  if (event.type !== "client_approved" && event.type !== "client_rejected") {
    return outcomes;
  }
  return outcomes.map((o) => {
    if (o.project_ref !== event.project_ref && o.template_id !== event.template_id) return o;
    return normalizeOutcome({
      ...o,
      approved_by_client: event.type === "client_approved",
      result_status: event.type === "client_approved" ? "client_approved" : "client_rejected",
      client_rating: event.type === "client_approved" ? Number(event.payload.rating ?? 5) : 2,
      revisions_count: Number(event.payload.revisions_count ?? o.revisions_count),
      notes: event.type === "client_rejected" ? String(event.payload.reason ?? "client rejected") : o.notes,
    });
  });
}

export function collectPhaseOutputs(
  phaseHDir?: string,
  phaseIDir?: string,
): { events: LearningEvent[]; outcomes: TemplateOutcome[] } {
  const events: LearningEvent[] = [];
  const outcomes: TemplateOutcome[] = [];

  if (phaseHDir && existsSync(phaseHDir)) {
    const h = ingestPhaseHOutput(phaseHDir);
    events.push(...h.events);
    if (h.outcome) outcomes.push(h.outcome);
  }

  if (phaseIDir && existsSync(phaseIDir)) {
    const i = ingestPhaseIOutput(phaseIDir);
    events.push(...i.events);
    if (i.outcome) outcomes.push(i.outcome);
  }

  return { events, outcomes };
}
