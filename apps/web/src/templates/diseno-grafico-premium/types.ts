export type DisenoAuditStatus = "pass" | "warn" | "fail" | "pending";

export type DisenoAuditPriority = "P1" | "P2" | "P3";

/** Graphic design / creative formats for disclosure badges (not design SaaS or asset APIs). */
export type DisenoFormatKind =
  | "banner_digital"
  | "flyer"
  | "cartel"
  | "infografia"
  | "presentacion"
  | "packaging"
  | "creatividad_ads"
  | "post_social"
  | "kit_brand";

export interface DisenoPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface DisenoAuditItem {
  id: string;
  label: string;
  status: DisenoAuditStatus;
  priority: DisenoAuditPriority;
  evidence: string;
  formats?: readonly DisenoFormatKind[];
}

export type DisenoModule =
  | "briefing_concept"
  | "sketches_proposals"
  | "design_composition"
  | "review_feedback"
  | "adaptations_formats"
  | "delivery"
  | "reporting";

export interface DisenoDeliverableSection {
  id: string;
  module: DisenoModule;
  title: string;
  intro?: string;
  items: DisenoAuditItem[];
}

export interface DisenoProjectConfig {
  pageSeo: DisenoPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: DisenoDeliverableSection[];
}
