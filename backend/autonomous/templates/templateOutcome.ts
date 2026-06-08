/** Template outcome model — validation, normalization, aggregation helpers */

import type { ResultStatus, TemplateCategory, TemplateOutcome } from "./types";

const CATEGORIES: TemplateCategory[] = ["landing", "website", "ecommerce", "chatbot", "ads", "branding"];

const STATUSES: ResultStatus[] = [
  "generated",
  "qa_passed",
  "qa_failed",
  "published_internal",
  "client_approved",
  "client_rejected",
  "conversion",
  "no_conversion",
  "escalated",
];

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function isTemplateCategory(v: string): v is TemplateCategory {
  return (CATEGORIES as string[]).includes(v);
}

export function isResultStatus(v: string): v is ResultStatus {
  return (STATUSES as string[]).includes(v);
}

export function normalizeOutcome(raw: unknown): TemplateOutcome {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("outcome inválido: se esperaba objeto");
  }
  const o = raw as Record<string, unknown>;
  const category = String(o.category ?? "");
  if (!isTemplateCategory(category)) {
    throw new Error(`category inválida: ${category}`);
  }
  const status = String(o.result_status ?? "generated");
  if (!isResultStatus(status)) {
    throw new Error(`result_status inválido: ${status}`);
  }

  const qa = Number(o.qa_score ?? 0);
  const revisions = Math.max(0, Math.round(Number(o.revisions_count ?? 0)));
  const convRaw = o.conversion_rate;
  const conversion_rate =
    convRaw === null || convRaw === undefined ? null : clampScore(Number(convRaw));

  const ratingRaw = o.client_rating;
  const client_rating =
    ratingRaw === null || ratingRaw === undefined ? null : Math.max(1, Math.min(5, Number(ratingRaw)));

  return {
    id: String(o.id ?? `outcome-${Date.now()}`),
    project_ref: String(o.project_ref ?? "unknown"),
    template_id: String(o.template_id ?? "").trim(),
    category,
    sector: String(o.sector ?? "general"),
    service: String(o.service ?? category),
    objective: String(o.objective ?? "lead_gen"),
    channel: String(o.channel ?? "web"),
    language: String(o.language ?? "es"),
    level: String(o.level ?? "professional"),
    qa_score: clampScore(qa),
    approved_by_client: Boolean(o.approved_by_client),
    revisions_count: revisions,
    conversion_rate,
    lead_count: Math.max(0, Math.round(Number(o.lead_count ?? 0))),
    client_rating,
    delivery_time_hours: Math.max(0, Number(o.delivery_time_hours ?? 0)),
    result_status: status,
    notes: typeof o.notes === "string" ? o.notes : undefined,
    created_at: String(o.created_at ?? new Date().toISOString()),
  };
}

export function loadOutcomesFromJson(data: unknown): TemplateOutcome[] {
  if (!Array.isArray(data)) {
    throw new Error("fixtures outcomes: se esperaba array");
  }
  return data.map(normalizeOutcome);
}

export interface OutcomeAggregates {
  sample_size: number;
  qa_avg: number;
  qa_std: number;
  approval_rate: number;
  reject_rate: number;
  revisions_avg: number;
  conversion_avg: number | null;
  conversion_measured: number;
  first_pass_rate: number;
  lead_total: number;
  rating_avg: number | null;
  delivery_hours_avg: number;
}

export function aggregateOutcomes(outcomes: TemplateOutcome[]): OutcomeAggregates {
  const n = outcomes.length;
  if (n === 0) {
    return {
      sample_size: 0,
      qa_avg: 0,
      qa_std: 0,
      approval_rate: 0,
      reject_rate: 0,
      revisions_avg: 0,
      conversion_avg: null,
      conversion_measured: 0,
      first_pass_rate: 0,
      lead_total: 0,
      rating_avg: null,
      delivery_hours_avg: 0,
    };
  }

  const qaScores = outcomes.map((o) => o.qa_score);
  const qa_avg = qaScores.reduce((s, v) => s + v, 0) / n;
  const qa_var = qaScores.reduce((s, v) => s + (v - qa_avg) ** 2, 0) / n;
  const qa_std = Math.sqrt(qa_var);

  const approved = outcomes.filter((o) => o.approved_by_client).length;
  const rejected = outcomes.filter((o) => o.result_status === "client_rejected").length;
  const decided = approved + rejected;
  const approval_rate = decided > 0 ? approved / decided : approved > 0 ? 1 : 0;
  const reject_rate = n > 0 ? rejected / n : 0;

  const revisions_avg = outcomes.reduce((s, o) => s + o.revisions_count, 0) / n;

  const withConv = outcomes.filter((o) => o.conversion_rate !== null);
  const conversion_avg =
    withConv.length > 0
      ? withConv.reduce((s, o) => s + (o.conversion_rate as number), 0) / withConv.length
      : null;

  const first_pass = outcomes.filter((o) => o.revisions_count === 0 && o.qa_score >= 85).length;
  const first_pass_rate = first_pass / n;

  const ratings = outcomes.filter((o) => o.client_rating !== null).map((o) => o.client_rating as number);
  const rating_avg = ratings.length > 0 ? ratings.reduce((s, v) => s + v, 0) / ratings.length : null;

  return {
    sample_size: n,
    qa_avg: clampScore(qa_avg),
    qa_std: clampScore(qa_std),
    approval_rate: clampScore(approval_rate * 100) / 100,
    reject_rate: clampScore(reject_rate * 100) / 100,
    revisions_avg,
    conversion_avg: conversion_avg === null ? null : clampScore(conversion_avg),
    conversion_measured: withConv.length,
    first_pass_rate: clampScore(first_pass_rate * 100) / 100,
    lead_total: outcomes.reduce((s, o) => s + o.lead_count, 0),
    rating_avg,
    delivery_hours_avg: outcomes.reduce((s, o) => s + o.delivery_time_hours, 0) / n,
  };
}

export function outcomeMatchesSlice(outcome: TemplateOutcome, slice: {
  category: TemplateCategory;
  sector: string;
  service: string;
  objective?: string;
  channel?: string;
  language?: string;
  level?: string;
}): boolean {
  if (outcome.category !== slice.category) return false;
  if (outcome.sector !== slice.sector && slice.sector !== "general") return false;
  if (outcome.service !== slice.service) return false;
  if (slice.objective && outcome.objective !== slice.objective) return false;
  if (slice.channel && outcome.channel !== slice.channel) return false;
  if (slice.language && outcome.language !== slice.language) return false;
  if (slice.level && outcome.level !== slice.level) return false;
  return true;
}
