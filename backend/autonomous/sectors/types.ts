/** Phase E — sector agent types (isolated from OS/SaaS core) */

export type AutonomousSector =
  | "dental"
  | "legal"
  | "fitness"
  | "beauty"
  | "restaurant"
  | "real_estate"
  | "ecommerce"
  | "solar"
  | "coaching"
  | "saas_b2b";

export type SectorSensitivity = "low" | "medium" | "high";

export interface SectorPromptContext {
  ideal_client: string;
  primary_pains: string[];
  winning_offers: string[];
  landing_angle: string;
  seo_focus: string[];
  google_ads_angle: string;
  meta_ads_angle: string;
  chatbot_focus: string;
  automations: string[];
  typical_objections: string[];
  qa_focus: string[];
  templates: string[];
  compliance_notes: string[];
}

export interface SectorProfile {
  id: AutonomousSector;
  label: string;
  doc_path: string;
  autonomy_score: number;
  sensitivity: SectorSensitivity;
  regulated: boolean;
  requires_legal_review: boolean;
  escalate_operator_on_pass: boolean;
  promptContext: SectorPromptContext;
}

export interface SectorQaCheck {
  id: string;
  passed: boolean;
  blocking: boolean;
  message: string;
}
