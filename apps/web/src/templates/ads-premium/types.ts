export type AdsAuditStatus = "pass" | "warn" | "fail" | "pending";

export type AdsAuditPriority = "P1" | "P2" | "P3";

/** Supported channel taxonomy for OS handoff (no API wiring in v1). */
export type AdsChannel = "google_ads" | "meta_ads" | "other";

export interface AdsPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface AdsAuditItem {
  id: string;
  label: string;
  status: AdsAuditStatus;
  priority: AdsAuditPriority;
  evidence: string;
}

export type AdsCampaignModule =
  | "tracking"
  | "creatives"
  | "copy"
  | "segmentation"
  | "budget"
  | "optimization"
  | "reporting";

export interface AdsCampaignSection {
  id: string;
  module: AdsCampaignModule;
  title: string;
  intro?: string;
  items: AdsAuditItem[];
}

export interface AdsChannelRow {
  channel: AdsChannel;
  label: string;
  /** Used in demo to show multi-channel scope without API sync. */
  active: boolean;
}

export interface AdsCampaignConfig {
  pageSeo: AdsPremiumPageSeoConfig;
  clientLabel: string;
  campaignName: string;
  channels: AdsChannelRow[];
  auditSubtitle: string;
  generatedNote: string;
  sections: AdsCampaignSection[];
}
