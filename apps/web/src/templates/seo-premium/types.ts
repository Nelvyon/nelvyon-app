export type SEOAuditStatus = "pass" | "warn" | "fail" | "pending";

export type SEOAuditPriority = "P1" | "P2" | "P3";

/** Top-level audit modules shown as sections in the report. */
export type SEOAuditModule =
  | "technical"
  | "on_page"
  | "content"
  | "interlinking"
  | "cwv"
  | "reporting";

export interface SEOPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface SEOAuditItem {
  id: string;
  label: string;
  status: SEOAuditStatus;
  priority: SEOAuditPriority;
  /** Short operator-facing evidence (no live crawl data in template v1). */
  evidence: string;
}

export interface SEOAuditSection {
  id: string;
  module: SEOAuditModule;
  title: string;
  intro?: string;
  items: SEOAuditItem[];
}

export interface SEOAuditConfig {
  pageSeo: SEOPremiumPageSeoConfig;
  auditTitle: string;
  auditSubtitle: string;
  clientLabel: string;
  generatedNote: string;
  sections: SEOAuditSection[];
}
