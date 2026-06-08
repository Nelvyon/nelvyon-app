/** Phase N — deterministic GA4 mock (no external API) */

import type { Ga4AdapterInput, Ga4ConversionMetrics, Ga4DateRange } from "./types";

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDateRange(days: number): Ga4DateRange {
  return { startDate: isoDateDaysAgo(days - 1), endDate: todayIso() };
}

/** Stable hash 0–99 from strings (for reproducible mock metrics). */
function hashSeed(parts: string[]): number {
  let h = 0;
  const s = parts.filter(Boolean).join("|");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 100;
}

const SECTOR_SESSIONS: Record<string, number> = {
  restaurant: 4200,
  dental: 2800,
  solar: 1900,
  saas_b2b: 3500,
  ecommerce: 5100,
  general: 2400,
};

export function buildNullGa4Metrics(dateRange: Ga4DateRange): Ga4ConversionMetrics {
  return {
    sessions: 0,
    conversions: 0,
    conversion_rate: null,
    lead_count: 0,
    date_range: dateRange,
    source: "none",
    mode: "fallback",
  };
}

export function buildRealisticMockGa4Metrics(input: Ga4AdapterInput): Ga4ConversionMetrics {
  const days = input.date_range_days ?? 30;
  const date_range = buildDateRange(days);
  const sector = (input.sector ?? "general").trim() || "general";
  const templateId = (input.template_id ?? "landing-cro-v3").trim();
  const seed = hashSeed([sector, templateId, input.project_ref ?? "", input.page_path ?? ""]);

  const baseSessions = SECTOR_SESSIONS[sector] ?? SECTOR_SESSIONS.general;
  const sessions = Math.round(baseSessions * (0.85 + seed / 200));
  const crPct = 3.5 + (seed % 12) * 0.45 + (templateId.includes("cro") ? 1.2 : 0);
  const conversions = Math.max(1, Math.round((sessions * crPct) / 100));
  const lead_count = Math.max(conversions, Math.round(conversions * (1.05 + (seed % 5) * 0.08)));

  return {
    sessions,
    conversions,
    conversion_rate: Math.round(crPct * 100) / 100,
    lead_count,
    date_range,
    source: "mock",
    mode: "mock",
  };
}
