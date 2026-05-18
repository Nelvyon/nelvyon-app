export type BotsAuditStatus = "pass" | "warn" | "fail" | "pending";

export type BotsAuditPriority = "P1" | "P2" | "P3";

export interface BotsPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface BotsAuditItem {
  id: string;
  label: string;
  status: BotsAuditStatus;
  priority: BotsAuditPriority;
  evidence: string;
}

export type BotsModule =
  | "bot_config"
  | "channel_deploy"
  | "conversation"
  | "integrations"
  | "handoff"
  | "reporting";

export interface BotsDeliverableSection {
  id: string;
  module: BotsModule;
  title: string;
  intro?: string;
  items: BotsAuditItem[];
}

export interface BotsProjectConfig {
  pageSeo: BotsPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: BotsDeliverableSection[];
}
