export type AutomatizacionAuditStatus = "pass" | "warn" | "fail" | "pending";

export type AutomatizacionAuditPriority = "P1" | "P2" | "P3";

/** Automation pattern types for disclosure badges (no live flows or external APIs). */
export type AutomatizacionTypeKind =
  | "workflow"
  | "webhook"
  | "crm_automation"
  | "email_sequence"
  | "lead_scoring"
  | "reporting_auto"
  | "integration_flow";

export interface AutomatizacionPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface AutomatizacionAuditItem {
  id: string;
  label: string;
  status: AutomatizacionAuditStatus;
  priority: AutomatizacionAuditPriority;
  evidence: string;
  /** Automation types this row primarily concerns (badges in UI). */
  types?: readonly AutomatizacionTypeKind[];
}

export type AutomatizacionModule =
  | "process_diagnosis"
  | "flow_map"
  | "automation_design"
  | "implementation"
  | "testing_validation"
  | "documentation"
  | "reporting_metrics";

export interface AutomatizacionDeliverableSection {
  id: string;
  module: AutomatizacionModule;
  title: string;
  intro?: string;
  items: AutomatizacionAuditItem[];
}

export interface AutomatizacionProjectConfig {
  pageSeo: AutomatizacionPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: AutomatizacionDeliverableSection[];
}
