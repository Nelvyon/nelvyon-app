export type FotografiaAuditStatus = "pass" | "warn" | "fail" | "pending";

export type FotografiaAuditPriority = "P1" | "P2" | "P3";

/** Product photography formats for disclosure badges (not storage or CDN APIs). */
export type FotografiaFormatKind =
  | "pack_ecommerce"
  | "lifestyle"
  | "fondo_blanco"
  | "detalle"
  | "editorial"
  | "360_product"
  | "still_life";

export interface FotografiaPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface FotografiaAuditItem {
  id: string;
  label: string;
  status: FotografiaAuditStatus;
  priority: FotografiaAuditPriority;
  evidence: string;
  formats?: readonly FotografiaFormatKind[];
}

export type FotografiaModule =
  | "briefing_moodboard"
  | "session_direction"
  | "selection_editing"
  | "retouch_color"
  | "web_optimization"
  | "delivery_formats"
  | "reporting";

export interface FotografiaDeliverableSection {
  id: string;
  module: FotografiaModule;
  title: string;
  intro?: string;
  items: FotografiaAuditItem[];
}

export interface FotografiaProjectConfig {
  pageSeo: FotografiaPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: FotografiaDeliverableSection[];
}
