export type IntegracionAuditStatus = "pass" | "warn" | "fail" | "pending";

export type IntegracionAuditPriority = "P1" | "P2" | "P3";

/** Integration pattern types for disclosure badges (no live APIs or SDK calls). */
export type IntegracionTypeKind =
  | "rest_api"
  | "webhook"
  | "crm_sync"
  | "payment_gateway"
  | "erp_sync"
  | "oauth"
  | "third_party_sdk"
  | "data_pipeline";

export interface IntegracionPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface IntegracionAuditItem {
  id: string;
  label: string;
  status: IntegracionAuditStatus;
  priority: IntegracionAuditPriority;
  evidence: string;
  types?: readonly IntegracionTypeKind[];
}

export type IntegracionModule =
  | "analysis_design"
  | "auth_security"
  | "development_implementation"
  | "testing_qa"
  | "technical_documentation"
  | "monitoring"
  | "delivery_handoff";

export interface IntegracionDeliverableSection {
  id: string;
  module: IntegracionModule;
  title: string;
  intro?: string;
  items: IntegracionAuditItem[];
}

export interface IntegracionProjectConfig {
  pageSeo: IntegracionPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: IntegracionDeliverableSection[];
}
