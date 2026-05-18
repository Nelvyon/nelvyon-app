export type VideoAuditStatus = "pass" | "warn" | "fail" | "pending";

export type VideoAuditPriority = "P1" | "P2" | "P3";

/** Video / multimedia formats for disclosure badges (not render or upload APIs). */
export type VideoFormatKind =
  | "corporate"
  | "social_clip"
  | "reel"
  | "explainer"
  | "testimonial"
  | "ad_video"
  | "podcast"
  | "motion_graphics";

export interface VideoPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface VideoAuditItem {
  id: string;
  label: string;
  status: VideoAuditStatus;
  priority: VideoAuditPriority;
  evidence: string;
  /** Formats this row primarily concerns (badges in UI). */
  formats?: readonly VideoFormatKind[];
}

export type VideoModule =
  | "briefing_script"
  | "production"
  | "editing_post"
  | "mograph"
  | "subtitles_accessibility"
  | "delivery_formats"
  | "reporting";

export interface VideoDeliverableSection {
  id: string;
  module: VideoModule;
  title: string;
  intro?: string;
  items: VideoAuditItem[];
}

export interface VideoProjectConfig {
  pageSeo: VideoPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: VideoDeliverableSection[];
}
