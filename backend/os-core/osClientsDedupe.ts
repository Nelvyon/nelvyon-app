/** Dedupe keys for nelvyon_clients → os_clients backfill (OS-1-02). */

export type LegacyClientRow = {
  id: number;
  user_id: string;
  workspace_id: number | null;
  business_name: string;
  sector: string | null;
  country: string | null;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string | null;
  notes: string | null;
  ideal_customer: string | null;
  value_proposition: string | null;
  differentiator: string | null;
  services: string | null;
  objectives: string | null;
  brand_tone: string | null;
  visual_style: string | null;
  brand_colors: string | null;
  logo_url: string | null;
  competition: string | null;
  testimonials: string | null;
  case_studies: string | null;
  budget: string | null;
  language: string | null;
  market: string | null;
  website_url: string | null;
  created_at: Date | null;
};

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const t = email.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

export function normalizeName(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

/** Dedupe: workspace + email if present, else workspace + business_name. */
export function buildClientDedupeKey(workspaceId: number, email: string | null, businessName: string): string {
  const em = normalizeEmail(email);
  if (em) return `ws:${workspaceId}|email:${em}`;
  return `ws:${workspaceId}|name:${normalizeName(businessName)}`;
}

export function mapLegacyStatus(status: string | null | undefined): "active" | "archived" {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "archived" || s === "inactive" || s === "churned") return "archived";
  return "active";
}

export const LEGACY_SOURCE = "etl:legacy:nelvyon_clients";
