export type OsClientStatus = "active" | "archived";

/** Canonical os_clients row (UUID id). */
export interface OsClient {
  id: string;
  workspace_id: number;
  created_by_user_id: string;
  business_name: string;
  sector?: string | null;
  country?: string | null;
  city?: string | null;
  status: OsClientStatus;
  contact_email?: string | null;
  contact_name?: string | null;
  website_url?: string | null;
  ideal_customer?: string | null;
  value_proposition?: string | null;
  differentiator?: string | null;
  services?: string | null;
  objectives?: string | null;
  brand_tone?: string | null;
  visual_style?: string | null;
  brand_colors?: string | null;
  logo_url?: string | null;
  competition?: string | null;
  testimonials?: string | null;
  case_studies?: string | null;
  budget?: string | null;
  language?: string | null;
  market?: string | null;
  metadata: Record<string, unknown>;
  legacy_nelvyon_client_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OsClientListResponse {
  items: OsClient[];
  total: number;
  skip: number;
  limit: number;
}

export interface OsClientCreateInput {
  business_name: string;
  sector?: string;
  country?: string;
  city?: string;
  status?: OsClientStatus;
  contact_email?: string;
  contact_name?: string;
  website_url?: string;
  ideal_customer?: string;
  value_proposition?: string;
  differentiator?: string;
  services?: string;
  objectives?: string;
  brand_tone?: string;
  visual_style?: string;
  brand_colors?: string;
  logo_url?: string;
  competition?: string;
  testimonials?: string;
  case_studies?: string;
  budget?: string;
  language?: string;
  market?: string;
  metadata?: Record<string, unknown>;
}

export type OsClientUpdateInput = Partial<OsClientCreateInput>;

export interface OsClientMetrics {
  projectsTotal: number;
  projectsActive: number;
  deliverablesTotal: number;
}

/** Linked project summary (read-only from os_projects). */
export interface OsClientLinkedProject {
  id: string;
  name: string;
  status: string;
  priority?: string | null;
}

/** Legacy nelvyon_clients — other OS modules until OS-1-UI-04+. */
export interface OsLegacyClient {
  id: number;
  user_id: string;
  workspace_id: number | null;
  business_name: string;
  sector: string;
  country?: string | null;
  city?: string | null;
  ideal_customer?: string | null;
  value_proposition?: string | null;
  differentiator?: string | null;
  services?: string | null;
  objectives?: string | null;
  brand_tone?: string | null;
  visual_style?: string | null;
  brand_colors?: string | null;
  logo_url?: string | null;
  competition?: string | null;
  testimonials?: string | null;
  case_studies?: string | null;
  budget?: string | null;
  language?: string | null;
  market?: string | null;
  website_url?: string | null;
}

export interface OsLegacyClientListResponse {
  items: OsLegacyClient[];
  total: number;
  skip: number;
  limit: number;
}

/** @deprecated Use OsLegacyClient in pickers until module UI migration (OS-1-UI-04+). */
export type OsClientPickerRow = OsLegacyClient;

export type OsLegacyClientWriteInput = Partial<
  Pick<
    OsLegacyClient,
    | "business_name"
    | "sector"
    | "country"
    | "city"
    | "ideal_customer"
    | "value_proposition"
    | "differentiator"
    | "services"
    | "objectives"
    | "brand_tone"
    | "visual_style"
    | "brand_colors"
    | "logo_url"
    | "competition"
    | "testimonials"
    | "case_studies"
    | "budget"
    | "language"
    | "market"
    | "website_url"
  >
> & {
  business_name: string;
  sector: string;
};
