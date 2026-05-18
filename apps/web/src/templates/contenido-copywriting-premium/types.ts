export type ContenidoAuditStatus = "pass" | "warn" | "fail" | "pending";

export type ContenidoAuditPriority = "P1" | "P2" | "P3";

/** Content/copy formats for disclosure badges (not generators or CMS bindings). */
export type ContenidoContentFormat =
  | "blog"
  | "landing"
  | "web_copy"
  | "email_copy"
  | "ads_copy"
  | "script"
  | "social_media"
  | "seo_content";

export interface ContenidoPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface ContenidoAuditItem {
  id: string;
  label: string;
  status: ContenidoAuditStatus;
  priority: ContenidoAuditPriority;
  evidence: string;
  /** Formats this row primarily concerns (badges in UI). */
  formats?: readonly ContenidoContentFormat[];
}

export type ContenidoModule =
  | "strategy_voice"
  | "editorial_calendar"
  | "writing_copy"
  | "review_quality"
  | "seo_onpage"
  | "deliverables_reporting";

export interface ContenidoDeliverableSection {
  id: string;
  module: ContenidoModule;
  title: string;
  intro?: string;
  items: ContenidoAuditItem[];
}

export interface ContenidoProjectConfig {
  pageSeo: ContenidoPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: ContenidoDeliverableSection[];
}
