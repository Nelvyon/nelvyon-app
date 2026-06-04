export interface OsClient {
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

export interface OsClientListResponse {
  items: OsClient[];
  total: number;
  skip: number;
  limit: number;
}

export type OsClientWriteInput = Partial<
  Pick<
    OsClient,
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

export interface OsClientMetrics {
  projectsTotal: number;
  projectsActive: number;
  outputsTotal: number;
  campaignsTotal: number;
}
