export type OrmAuditStatus = "pass" | "warn" | "fail" | "pending";

export type OrmAuditPriority = "P1" | "P2" | "P3";

/** ORM / reputation work types for disclosure badges (no monitoring or scraping APIs). */
export type OrmTypeKind =
  | "auditoria_reputacion"
  | "gestion_resenas"
  | "contenido_positivo"
  | "supresion_negativo"
  | "monitorizacion_marca"
  | "crisis_management"
  | "reporting";

export interface OrmPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface OrmAuditItem {
  id: string;
  label: string;
  status: OrmAuditStatus;
  priority: OrmAuditPriority;
  evidence: string;
  types?: readonly OrmTypeKind[];
}

export type OrmModule =
  | "reputation_audit"
  | "review_management"
  | "positive_content"
  | "negative_suppression"
  | "continuous_monitoring"
  | "crisis_management"
  | "monthly_reporting";

export interface OrmDeliverableSection {
  id: string;
  module: OrmModule;
  title: string;
  intro?: string;
  items: OrmAuditItem[];
}

export interface OrmProjectConfig {
  pageSeo: OrmPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: OrmDeliverableSection[];
}
