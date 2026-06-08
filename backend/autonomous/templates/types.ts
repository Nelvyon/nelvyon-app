/** NELVYON Autonomous Phase K — template learning types (isolated, no DB) */

export type TemplateCategory = "landing" | "website" | "ecommerce" | "chatbot" | "ads" | "branding";

export type ResultStatus =
  | "generated"
  | "qa_passed"
  | "qa_failed"
  | "published_internal"
  | "client_approved"
  | "client_rejected"
  | "conversion"
  | "no_conversion"
  | "escalated";

export type LearningEventType =
  | "landing_generated"
  | "qa_completed"
  | "preview_generated"
  | "os_publish_dry_run"
  | "client_approved"
  | "client_rejected";

export interface TemplateOutcome {
  id: string;
  project_ref: string;
  template_id: string;
  category: TemplateCategory;
  sector: string;
  service: string;
  objective: string;
  channel: string;
  language: string;
  level: string;
  qa_score: number;
  approved_by_client: boolean;
  revisions_count: number;
  /** 0–100 percentage; null if not measured */
  conversion_rate: number | null;
  lead_count: number;
  /** 1–5; null if not rated */
  client_rating: number | null;
  delivery_time_hours: number;
  result_status: ResultStatus;
  notes?: string;
  created_at: string;
}

export interface TemplateBaselineScores {
  quality_score: number;
  conversion_score: number;
  usage_score: number;
  reliability_score: number;
}

export interface TemplateRegistryEntry {
  id: string;
  category: TemplateCategory;
  sectors: string[];
  services: string[];
  objectives: string[];
  channels: string[];
  languages: string[];
  levels: string[];
  status: "active" | "deprecated" | "suspended";
  factory_version: string;
  baseline_scores: TemplateBaselineScores;
}

export interface TemplateRegistry {
  version: string;
  templates: TemplateRegistryEntry[];
}

export interface TemplateSlice {
  category: TemplateCategory;
  sector: string;
  service: string;
  objective?: string;
  channel?: string;
  language?: string;
  level?: string;
}

export interface TemplateScoreBreakdown {
  template_id: string;
  sample_size: number;
  cold_start: boolean;
  conversion_score: number;
  quality_score: number;
  usage_score: number;
  reliability_score: number;
  final_template_score: number;
  metrics: {
    qa_avg: number;
    approval_rate: number;
    reject_rate: number;
    revisions_avg: number;
    conversion_avg: number | null;
    first_pass_rate: number;
  };
}

export interface RankedSlice {
  slice: TemplateSlice;
  ranked: TemplateScoreBreakdown[];
  computed_at: string;
}

export interface TemplateSelection {
  slice: TemplateSlice;
  selected_template_id: string;
  final_template_score: number;
  cold_start: boolean;
  alternatives: Array<{ template_id: string; final_template_score: number }>;
}

export interface LearningEvent {
  type: LearningEventType;
  at: string;
  project_ref: string;
  template_id: string;
  sector: string;
  category: TemplateCategory;
  payload: Record<string, unknown>;
}

export interface LearningEngineReport {
  phase: "K";
  computed_at: string;
  registry_version: string;
  outcomes_count: number;
  events_count: number;
  ranked_slices: number;
  selections: TemplateSelection[];
  autonomy_pct: {
    previous: number;
    current: number;
    delta: number;
    rationale: string;
  };
}
