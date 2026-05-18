export type AdvisorAuditStatus = "pass" | "warn" | "fail" | "pending";

export type AdvisorAuditPriority = "P1" | "P2" | "P3";

export interface AdvisorPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface AdvisorAuditItem {
  id: string;
  label: string;
  status: AdvisorAuditStatus;
  priority: AdvisorAuditPriority;
  evidence: string;
}

export type AdvisorModule =
  | "diagnosis_initial"
  | "strategy"
  | "action_plan"
  | "kpi_metrics"
  | "followup_review"
  | "deliverables_reporting";

export interface AdvisorDeliverableSection {
  id: string;
  module: AdvisorModule;
  title: string;
  intro?: string;
  items: AdvisorAuditItem[];
}

export interface AdvisorProjectConfig {
  pageSeo: AdvisorPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: AdvisorDeliverableSection[];
}
