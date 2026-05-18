export type CanalesAuditStatus = "pass" | "warn" | "fail" | "pending";

export type CanalesAuditPriority = "P1" | "P2" | "P3";

/** Supported channel kinds for disclosure in delivery paperwork (not transport config). */
export type CanalesChannelKind = "email" | "sms" | "whatsapp" | "push" | "in_app";

export interface CanalesPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface CanalesAuditItem {
  id: string;
  label: string;
  status: CanalesAuditStatus;
  priority: CanalesAuditPriority;
  evidence: string;
  /** Optional: which channel kinds this row primarily concerns. */
  channels?: readonly CanalesChannelKind[];
}

export type CanalesModule =
  | "channel_config"
  | "templates_copy"
  | "segmentation"
  | "automations"
  | "deliverability"
  | "reporting";

export interface CanalesDeliverableSection {
  id: string;
  module: CanalesModule;
  title: string;
  intro?: string;
  items: CanalesAuditItem[];
}

export interface CanalesProjectConfig {
  pageSeo: CanalesPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: CanalesDeliverableSection[];
}
