export type BrandingAuditStatus = "pass" | "warn" | "fail" | "pending";

export type BrandingAuditPriority = "P1" | "P2" | "P3";

export interface BrandingPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface BrandingAuditItem {
  id: string;
  label: string;
  status: BrandingAuditStatus;
  priority: BrandingAuditPriority;
  evidence: string;
}

export type BrandingModule =
  | "visual_identity"
  | "typography"
  | "color"
  | "voice"
  | "applications"
  | "brandbook";

export interface BrandingDeliverableSection {
  id: string;
  module: BrandingModule;
  title: string;
  intro?: string;
  items: BrandingAuditItem[];
}

export interface BrandingProjectConfig {
  pageSeo: BrandingPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: BrandingDeliverableSection[];
}
