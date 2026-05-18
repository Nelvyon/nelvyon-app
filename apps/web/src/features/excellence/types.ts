export interface QaChecklistItem {
  key: string;
  label: string;
  status: "pass" | "warn" | "not-run";
  evidence: string;
  verify_path: string;
}

export interface QaChecklistResponse {
  generated_at: string;
  items: QaChecklistItem[];
}

export interface I18nModuleStatus {
  module: string;
  status: "ready" | "partial" | "pending";
  priority: "P1" | "P2";
  notes: string;
}

export interface I18nHotspot {
  route: string;
  status: "partial" | "pending";
  priority: "P1" | "P2";
  reason: string;
}

export interface I18nBaselineResponse {
  default_locale: string;
  enabled_locales: string[];
  modules: I18nModuleStatus[];
  hotspots: I18nHotspot[];
}

export interface GoldenPathStep {
  key: string;
  label: string;
  status: "pass" | "fail" | "pending";
  verification: string;
  verify_ref: string;
}

export interface GoldenPathResponse {
  criterion: string;
  steps: GoldenPathStep[];
}
