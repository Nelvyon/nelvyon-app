export type InfluencerAuditStatus = "pass" | "warn" | "fail" | "pending";

export type InfluencerAuditPriority = "P1" | "P2" | "P3";

/** Influencer tier / role types for disclosure badges (no marketplace or contract APIs). */
export type InfluencerTypeKind =
  | "nano"
  | "micro"
  | "macro"
  | "mega"
  | "brand_ambassador"
  | "ugc_creator"
  | "celebrity"
  | "b2b_thought_leader";

export interface InfluencerPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface InfluencerAuditItem {
  id: string;
  label: string;
  status: InfluencerAuditStatus;
  priority: InfluencerAuditPriority;
  evidence: string;
  types?: readonly InfluencerTypeKind[];
}

export type InfluencerModule =
  | "strategy_objectives"
  | "influencer_search_selection"
  | "briefing_contract"
  | "content_production"
  | "publication_tracking"
  | "metrics_roi"
  | "final_reporting";

export interface InfluencerDeliverableSection {
  id: string;
  module: InfluencerModule;
  title: string;
  intro?: string;
  items: InfluencerAuditItem[];
}

export interface InfluencerProjectConfig {
  pageSeo: InfluencerPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: InfluencerDeliverableSection[];
}
