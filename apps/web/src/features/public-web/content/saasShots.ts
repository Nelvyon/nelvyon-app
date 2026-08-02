/**
 * Manifest of real SaaS UI captures for the public marketing site.
 * Prefer these over NelvyonProductMock when the WebP exists.
 */
import type { ProductMockVariant } from "./catalog";

export type SaasShotId =
  | "dashboard"
  | "crm"
  | "pipeline"
  | "workflows"
  | "agentes"
  | "ai"
  | "chat"
  | "analytics"
  | "calendar"
  | "campanias"
  | "billing"
  | "store"
  | "lms"
  | "integraciones"
  | "settings"
  | "inbox"
  | "dashboard-mobile"
  | "crm-mobile";

/** Map mock variants / catalog mockVariant → shot id */
export const MOCK_TO_SHOT: Partial<Record<ProductMockVariant, SaasShotId>> = {
  dashboard: "dashboard",
  crm: "crm",
  pipeline: "pipeline",
  campaigns: "campanias",
  workflows: "workflows",
  inbox: "inbox",
  billing: "billing",
  ai: "ai",
  analytics: "analytics",
  calendar: "calendar",
  store: "store",
  lms: "lms",
  agentes: "agentes",
};

/** Catalog / marketing slug → shot */
export const SLUG_TO_SHOT: Record<string, SaasShotId> = {
  crm: "crm",
  pipeline: "pipeline",
  workflows: "workflows",
  ia: "ai",
  agentes: "agentes",
  campanas: "campanias",
  calendario: "calendar",
  billing: "billing",
  analytics: "analytics",
  store: "store",
  lms: "lms",
  inbox: "inbox",
  marketing: "campanias",
};

export function saasShotSrc(id: SaasShotId, variant: "hero" | "card" = "hero"): string {
  return variant === "card"
    ? `/brand/public/saas-shots/cards/${id}.webp`
    : `/brand/public/saas-shots/${id}.webp`;
}

export function shotForMock(variant: ProductMockVariant): SaasShotId | null {
  return MOCK_TO_SHOT[variant] ?? null;
}

/** Shots used on Home capture slider */
export const HOME_SHOT_SLIDER: readonly { id: SaasShotId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "crm", label: "CRM" },
  { id: "campanias", label: "Email" },
  { id: "workflows", label: "Automatizaciones" },
  { id: "ai", label: "IA" },
] as const;

export const PRODUCT_HUB_SHOTS: readonly { id: SaasShotId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "crm", label: "CRM" },
  { id: "pipeline", label: "Pipeline" },
  { id: "workflows", label: "Automatizaciones" },
  { id: "agentes", label: "Agentes IA" },
  { id: "ai", label: "IA" },
  { id: "analytics", label: "Analytics" },
  { id: "calendar", label: "Calendario" },
  { id: "campanias", label: "Campañas" },
  { id: "billing", label: "Facturación" },
  { id: "store", label: "Ecommerce" },
  { id: "lms", label: "LMS" },
] as const;
