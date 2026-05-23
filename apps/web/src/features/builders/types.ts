export type BlockType =
  | "hero"
  | "text"
  | "image"
  | "video"
  | "cta"
  | "form"
  | "testimonials"
  | "pricing"
  | "faq"
  | "countdown"
  | "social_proof";

export interface BlockResponsive {
  hideOnMobile?: boolean;
  orderMobile?: number;
}

export interface LandingBlock {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  responsive?: BlockResponsive;
}

export interface PageMeta {
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  canonical_url?: string;
  keywords?: string[];
}

export interface PublicSitePage {
  subdomain?: string;
  store_name?: string;
  project_name?: string;
  page_slug?: string;
  name?: string;
  blocks: LandingBlock[];
  meta?: PageMeta;
  navigation?: { slug: string; label: string }[];
  currency?: string;
  form_fields?: unknown[];
  products?: StoreProduct[];
}

export interface StoreProduct {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ai_description?: string;
  price_cents: number;
  currency?: string;
  stock?: number;
  category?: string;
  images?: string[];
  meta?: Record<string, unknown>;
  is_active?: boolean;
}

export interface WebProject {
  id: string;
  name: string;
  subdomain?: string;
  status: string;
  pages_count?: number;
  site_url?: string;
  pages?: { id: string; page_type: string; page_slug: string; landing_page_id?: string }[];
  business_info?: Record<string, unknown>;
}

export interface StoreProject {
  id: string;
  name: string;
  subdomain?: string;
  status: string;
  currency?: string;
  store_url?: string;
  products?: StoreProduct[];
  pages?: unknown[];
}

export interface LandingPage {
  id: string;
  name: string;
  slug?: string;
  status: string;
  blocks?: LandingBlock[];
  meta?: PageMeta;
  meta_title?: string;
}

export interface Funnel {
  id: string;
  name: string;
  status: string;
  step_count?: number;
  steps?: unknown[];
}

export interface SocialPost {
  id: string;
  content?: string;
  status: string;
  scheduled_at?: string;
  post_type?: string;
}

export interface ChatConversation {
  id: string;
  visitor_name?: string;
  visitor_email?: string;
  status?: string;
  last_message_at?: string;
  unread_count?: number;
}
