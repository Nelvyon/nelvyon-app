export type FormacionAuditStatus = "pass" | "warn" | "fail" | "pending";

export type FormacionAuditPriority = "P1" | "P2" | "P3";

/** Training / enablement formats for disclosure badges (no LMS or external APIs). */
export type FormacionTypeKind =
  | "taller_presencial"
  | "curso_online"
  | "mentoria"
  | "webinar"
  | "manual_tecnico"
  | "onboarding_herramienta"
  | "programa_continuo";

export interface FormacionPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface FormacionAuditItem {
  id: string;
  label: string;
  status: FormacionAuditStatus;
  priority: FormacionAuditPriority;
  evidence: string;
  types?: readonly FormacionTypeKind[];
}

export type FormacionModule =
  | "needs_diagnosis"
  | "curriculum_design"
  | "materials_resources"
  | "delivery_instruction"
  | "evaluation_feedback"
  | "certification"
  | "reporting_followup";

export interface FormacionDeliverableSection {
  id: string;
  module: FormacionModule;
  title: string;
  intro?: string;
  items: FormacionAuditItem[];
}

export interface FormacionProjectConfig {
  pageSeo: FormacionPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: FormacionDeliverableSection[];
}
