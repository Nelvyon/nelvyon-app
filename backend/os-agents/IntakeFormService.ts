import { OS_PREMIUM_SERVICE_IDS } from "./constants";
import type { StoredClientIntake } from "./intakeSchemas";

export type IntakeFieldType = "text" | "textarea" | "select" | "multiselect" | "color" | "url" | "number" | "boolean";

export interface IntakeField {
  name: string;
  label: string;
  type: IntakeFieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Hint for array fields (e.g. competitors). */
  minItems?: number;
  maxItems?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const TONE_OPTIONS = [
  { value: "profesional", label: "Profesional" },
  { value: "cercano", label: "Cercano" },
  { value: "lujo", label: "Lujo" },
  { value: "joven", label: "Joven" },
] as const;

const BASE_FIELDS: IntakeField[] = [
  { name: "clientName", label: "Nombre de empresa / persona", type: "text", required: true, placeholder: "Ej. Studio Norte SL" },
  { name: "industry", label: "Sector", type: "text", required: true, placeholder: "Ej. restauración, moda, tecnología" },
  { name: "targetAudience", label: "Público objetivo", type: "textarea", required: true, placeholder: "Quién compra, edad, intereses…" },
  { name: "tone", label: "Tono de comunicación", type: "select", required: true, options: [...TONE_OPTIONS] },
  { name: "competitors", label: "Competidores principales", type: "multiselect", required: true, placeholder: "Añade al menos uno", minItems: 1, maxItems: 8 },
  { name: "primaryColor", label: "Color principal", type: "color", required: true },
  { name: "secondaryColor", label: "Color secundario", type: "color", required: true },
  { name: "logoUrl", label: "URL del logo (opcional)", type: "url", required: false, placeholder: "https://…" },
  { name: "referenceUrls", label: "Referencias web / proyectos", type: "multiselect", required: true, minItems: 1, maxItems: 12 },
  { name: "budget", label: "Presupuesto aproximado", type: "text", required: false, placeholder: "Ej. 5k–8k €" },
  { name: "deadline", label: "Fecha límite deseada", type: "text", required: false, placeholder: "Ej. 2026-09-01" },
  { name: "additionalNotes", label: "Notas adicionales", type: "textarea", required: false, placeholder: "Cualquier contexto extra…" },
];

const WEB_EXTRA: IntakeField[] = [
  { name: "pages", label: "Páginas que necesitas", type: "multiselect", required: true, minItems: 1, maxItems: 20, placeholder: "home, about, services…" },
  {
    name: "hasExistingContent",
    label: "¿Contenido o web existente?",
    type: "boolean",
    required: true,
  },
  {
    name: "preferredPlatform",
    label: "Plataforma preferida",
    type: "select",
    required: false,
    options: [
      { value: "wordpress", label: "WordPress" },
      { value: "nextjs", label: "Next.js" },
      { value: "webflow", label: "Webflow" },
      { value: "otro", label: "Otro / indiferente" },
    ],
  },
];

const SEO_EXTRA: IntakeField[] = [
  { name: "targetKeywords", label: "Palabras clave objetivo", type: "multiselect", required: true, minItems: 1, maxItems: 40 },
  { name: "currentWebsiteUrl", label: "Web actual (opcional)", type: "url", required: false, placeholder: "https://…" },
  { name: "mainGoal", label: "Objetivo SEO principal", type: "textarea", required: true, placeholder: "Ej. captar leads B2B en ES…" },
];

const ADS_EXTRA: IntakeField[] = [
  {
    name: "platforms",
    label: "Plataformas de pago",
    type: "multiselect",
    required: true,
    minItems: 1,
    maxItems: 10,
    options: [
      { value: "google", label: "Google Ads" },
      { value: "meta", label: "Meta" },
      { value: "tiktok", label: "TikTok" },
      { value: "linkedin", label: "LinkedIn" },
    ],
  },
  { name: "monthlyBudget", label: "Presupuesto mensual (€)", type: "number", required: true, placeholder: "1500" },
  { name: "campaignGoal", label: "Objetivo de campaña", type: "textarea", required: true, placeholder: "Ventas, leads, awareness…" },
];

const SOCIAL_EXTRA: IntakeField[] = [
  {
    name: "platforms",
    label: "Redes sociales",
    type: "multiselect",
    required: true,
    minItems: 1,
    maxItems: 8,
    options: [
      { value: "instagram", label: "Instagram" },
      { value: "linkedin", label: "LinkedIn" },
      { value: "tiktok", label: "TikTok" },
      { value: "facebook", label: "Facebook" },
      { value: "x", label: "X (Twitter)" },
    ],
  },
  { name: "postFrequency", label: "Frecuencia de publicación", type: "select", required: true, options: [
    { value: "diaria", label: "Diaria" },
    { value: "3x-semana", label: "3× semana" },
    { value: "semanal", label: "Semanal" },
    { value: "quincenal", label: "Quincenal" },
  ] },
  { name: "contentStyle", label: "Estilo visual preferido", type: "textarea", required: true, placeholder: "Minimal, editorial, UGC…" },
];

function isPremiumServiceId(id: string): boolean {
  return (OS_PREMIUM_SERVICE_IDS as readonly string[]).includes(id);
}

function getExtraFields(serviceId: string): IntakeField[] {
  switch (serviceId) {
    case "web_premium":
      return WEB_EXTRA;
    case "seo_premium":
      return SEO_EXTRA;
    case "ads_premium":
      return ADS_EXTRA;
    case "social_media_premium":
      return SOCIAL_EXTRA;
    default:
      return [];
  }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
  }
  if (typeof v === "string" && v.trim().length > 0) {
    return v
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

function asBoolean(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function getSchemaForService(serviceId: string): IntakeField[] {
  const extra = isPremiumServiceId(serviceId) ? getExtraFields(serviceId) : [];
  return [...BASE_FIELDS, ...extra];
}

export function validateIntake(serviceId: string, data: Record<string, unknown>): ValidationResult {
  const fields = getSchemaForService(serviceId);
  const errors: Record<string, string> = {};

  for (const f of fields) {
    const raw = data[f.name];
    if (f.required) {
      if (f.type === "multiselect") {
        const arr = asStringArray(raw);
        const min = f.minItems ?? 1;
        if (arr.length < min) {
          errors[f.name] = "Requerido";
        }
        if (f.maxItems !== undefined && arr.length > f.maxItems) {
          errors[f.name] = `Máximo ${f.maxItems} valores`;
        }
      } else if (f.type === "boolean") {
        if (asBoolean(raw) === undefined) {
          errors[f.name] = "Requerido";
        }
      } else if (f.type === "number") {
        if (asNumber(raw) === undefined) {
          errors[f.name] = "Requerido";
        }
      } else if (!isNonEmptyString(raw)) {
        errors[f.name] = "Requerido";
      }
    } else if (f.type === "url" && raw !== undefined && raw !== null && String(raw).trim().length > 0) {
      const s = String(raw).trim();
      if (!/^https?:\/\//i.test(s)) {
        errors[f.name] = "URL debe empezar por http(s)://";
      }
    }
  }

  if (!errors.clientName && isNonEmptyString(data.clientName) && String(data.clientName).trim().length < 2) {
    errors.clientName = "Nombre demasiado corto";
  }

  if (!errors.primaryColor && isNonEmptyString(data.primaryColor)) {
    const c = String(data.primaryColor).trim();
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) {
      errors.primaryColor = "Hex inválido";
    }
  }
  if (!errors.secondaryColor && isNonEmptyString(data.secondaryColor)) {
    const c = String(data.secondaryColor).trim();
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) {
      errors.secondaryColor = "Hex inválido";
    }
  }

  if (serviceId === "ads_premium" && !errors.monthlyBudget) {
    const n = asNumber(data.monthlyBudget);
    if (n !== undefined && n < 0) {
      errors.monthlyBudget = "Debe ser ≥ 0";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Coerces validated form JSON into a stable `StoredClientIntake` snapshot (call only after `validateIntake` succeeds).
 */
export function normalizeStoredIntake(serviceId: string, data: Record<string, unknown>): StoredClientIntake {
  const out: StoredClientIntake = {
    clientName: String(data.clientName ?? "").trim(),
    industry: String(data.industry ?? "").trim(),
    targetAudience: String(data.targetAudience ?? "").trim(),
    tone: String(data.tone ?? "").trim(),
    competitors: asStringArray(data.competitors),
    primaryColor: String(data.primaryColor ?? "").trim(),
    secondaryColor: String(data.secondaryColor ?? "").trim(),
    referenceUrls: asStringArray(data.referenceUrls),
  };
  const logoUrl = data.logoUrl;
  if (typeof logoUrl === "string" && logoUrl.trim().length > 0) {
    out.logoUrl = logoUrl.trim();
  }
  const budget = data.budget;
  if (typeof budget === "string" && budget.trim().length > 0) {
    out.budget = budget.trim();
  }
  const deadline = data.deadline;
  if (typeof deadline === "string" && deadline.trim().length > 0) {
    out.deadline = deadline.trim();
  }
  const notes = data.additionalNotes;
  if (typeof notes === "string" && notes.trim().length > 0) {
    out.additionalNotes = notes.trim();
  }

  if (serviceId === "web_premium") {
    out.pages = asStringArray(data.pages);
    const hb = asBoolean(data.hasExistingContent);
    if (hb !== undefined) {
      out.hasExistingContent = hb;
    }
    const plat = data.preferredPlatform;
    if (typeof plat === "string" && plat.trim().length > 0) {
      out.preferredPlatform = plat.trim();
    }
  } else if (serviceId === "seo_premium") {
    out.targetKeywords = asStringArray(data.targetKeywords);
    const cur = data.currentWebsiteUrl;
    if (typeof cur === "string" && cur.trim().length > 0) {
      out.currentWebsiteUrl = cur.trim();
    }
    out.mainGoal = String(data.mainGoal ?? "").trim();
  } else if (serviceId === "ads_premium") {
    out.platforms = asStringArray(data.platforms);
    const mb = asNumber(data.monthlyBudget);
    if (mb !== undefined) {
      out.monthlyBudget = mb;
    }
    out.campaignGoal = String(data.campaignGoal ?? "").trim();
  } else if (serviceId === "social_media_premium") {
    out.platforms = asStringArray(data.platforms);
    out.postFrequency = String(data.postFrequency ?? "").trim();
    out.contentStyle = String(data.contentStyle ?? "").trim();
  }

  return out;
}
