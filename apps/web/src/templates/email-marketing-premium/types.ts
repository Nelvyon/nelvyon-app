export type EmailMarketingAuditStatus = "pass" | "warn" | "fail" | "pending";

export type EmailMarketingAuditPriority = "P1" | "P2" | "P3";

/** Email program kinds for disclosure badges (not ESP bindings). */
export type EmailMarketingProgramKind = "newsletter" | "campaign" | "automation" | "transactional" | "nurturing";

export interface EmailMarketingPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface EmailMarketingAuditItem {
  id: string;
  label: string;
  status: EmailMarketingAuditStatus;
  priority: EmailMarketingAuditPriority;
  evidence: string;
  /** Email types this row primarily concerns (badges in UI). */
  emailKinds?: readonly EmailMarketingProgramKind[];
}

export type EmailMarketingModule =
  | "strategy_segmentation"
  | "design_templates"
  | "copy_subjects"
  | "automations_flows"
  | "deliverability_reputation"
  | "metrics_reporting";

export interface EmailMarketingDeliverableSection {
  id: string;
  module: EmailMarketingModule;
  title: string;
  intro?: string;
  items: EmailMarketingAuditItem[];
}

export interface EmailMarketingProjectConfig {
  pageSeo: EmailMarketingPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: EmailMarketingDeliverableSection[];
}
