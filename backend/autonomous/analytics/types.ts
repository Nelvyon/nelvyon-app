/** Phase N — GA4 conversion metrics for autonomous learning (isolated) */

export type Ga4AdapterMode = "mock" | "real" | "fallback";

export interface Ga4DateRange {
  startDate: string;
  endDate: string;
}

export interface Ga4ConversionMetrics {
  sessions: number;
  conversions: number;
  conversion_rate: number | null;
  lead_count: number;
  date_range: Ga4DateRange;
  source: "mock" | "ga4" | "none";
  mode: Ga4AdapterMode;
}

export interface Ga4AdapterInput {
  property_id?: string | null;
  page_path?: string | null;
  sector?: string | null;
  template_id?: string | null;
  project_ref?: string | null;
  deliverable_id?: string | null;
  date_range_days?: number;
  /** When true and not in real mode, returns deterministic mock metrics (tests/staging). */
  realistic_mock?: boolean;
}

export interface EnrichedTemplateOutcome {
  outcome_id: string;
  project_ref: string;
  template_id: string;
  sector: string;
  conversion_rate: number | null;
  lead_count: number;
  ga4: Ga4ConversionMetrics;
  enriched_at: string;
}
