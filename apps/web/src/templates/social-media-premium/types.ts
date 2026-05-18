export type SocialMediaAuditStatus = "pass" | "warn" | "fail" | "pending";

export type SocialMediaAuditPriority = "P1" | "P2" | "P3";

/** Platforms referenced in delivery paperwork (not API bindings). */
export type SocialMediaPlatform = "instagram" | "linkedin" | "tiktok" | "x_twitter" | "facebook" | "youtube";

export interface SocialMediaPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface SocialMediaAuditItem {
  id: string;
  label: string;
  status: SocialMediaAuditStatus;
  priority: SocialMediaAuditPriority;
  evidence: string;
  /** Platforms this row primarily concerns (badges in UI). */
  platforms?: readonly SocialMediaPlatform[];
}

export type SocialMediaModule =
  | "strategy_calendar"
  | "creative_copy"
  | "publishing"
  | "community_engagement"
  | "growth_reach"
  | "reporting";

export interface SocialMediaDeliverableSection {
  id: string;
  module: SocialMediaModule;
  title: string;
  intro?: string;
  items: SocialMediaAuditItem[];
}

export interface SocialMediaProjectConfig {
  pageSeo: SocialMediaPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: SocialMediaDeliverableSection[];
}
