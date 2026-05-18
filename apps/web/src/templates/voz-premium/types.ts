export type VozAuditStatus = "pass" | "warn" | "fail" | "pending";

export type VozAuditPriority = "P1" | "P2" | "P3";

export interface VozPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface VozAuditItem {
  id: string;
  label: string;
  status: VozAuditStatus;
  priority: VozAuditPriority;
  evidence: string;
}

export type VozModule =
  | "agent_config"
  | "voice_quality"
  | "script_flow"
  | "localization"
  | "handoff"
  | "reporting";

export interface VozDeliverableSection {
  id: string;
  module: VozModule;
  title: string;
  intro?: string;
  items: VozAuditItem[];
}

export interface VozProjectConfig {
  pageSeo: VozPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: VozDeliverableSection[];
}
