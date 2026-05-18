export type InmersivoAuditStatus = "pass" | "warn" | "fail" | "pending";

export type InmersivoAuditPriority = "P1" | "P2" | "P3";

/** 3D / immersive formats for disclosure badges (not engine or render APIs). */
export type InmersivoFormatKind =
  | "model_3d"
  | "animation_3d"
  | "ar_experience"
  | "vr_experience"
  | "product_visualizer"
  | "interactive_scene"
  | "motion_3d";

export interface InmersivoPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface InmersivoAuditItem {
  id: string;
  label: string;
  status: InmersivoAuditStatus;
  priority: InmersivoAuditPriority;
  evidence: string;
  /** Formats this row primarily concerns (badges in UI). */
  formats?: readonly InmersivoFormatKind[];
}

export type InmersivoModule =
  | "briefing_concept"
  | "modeling_3d"
  | "texturing_materials"
  | "animation"
  | "optimization_performance"
  | "delivery_formats"
  | "reporting";

export interface InmersivoDeliverableSection {
  id: string;
  module: InmersivoModule;
  title: string;
  intro?: string;
  items: InmersivoAuditItem[];
}

export interface InmersivoProjectConfig {
  pageSeo: InmersivoPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: InmersivoDeliverableSection[];
}
