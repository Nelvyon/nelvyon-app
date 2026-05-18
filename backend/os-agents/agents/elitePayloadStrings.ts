import type { OsJobPayload } from "../types";

function asTrimmedString(v: unknown, fallback: string): string {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
}

function asJoinedList(v: unknown, fallback: string): string {
  if (Array.isArray(v)) {
    const parts = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
    if (parts.length > 0) return parts.join(", ");
  }
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return fallback;
}

function defaultBrief(payload: OsJobPayload): string {
  const raw = typeof payload.brief === "string" ? payload.brief.trim() : "";
  return raw.length > 0
    ? raw
    : "Brief adicional pendiente: infiere objetivos premium coherentes con sector y posicionamiento.";
}

/** Base intake fields shared by Lote 1 elite agents (Stripe + form pipeline). */
export function eliteCommonIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return {
    clientName: asTrimmedString(payload.clientName, "Cliente premium (nombre por confirmar en kickoff)"),
    industry: asTrimmedString(payload.industry, "Sector a definir con el cliente en sesión estratégica"),
    targetAudience: asTrimmedString(payload.targetAudience, "Público objetivo por perfilar con research cualitativo/cuantitativo"),
    tone: asTrimmedString(payload.tone, "Tono de marca a acordar (referencia: profesional, preciso, aspiracional)"),
    competitors: asJoinedList(
      payload.competitors,
      "Competidores por mapear en benchmark competitivo (indicar referencias en kickoff)",
    ),
    brief: defaultBrief(payload),
    primaryColor: asTrimmedString(payload.primaryColor, "#0f172a (sugerencia base hasta guía cromática)"),
    secondaryColor: asTrimmedString(payload.secondaryColor, "#64748b (sugerencia secundaria hasta brand system)"),
    referenceUrls: asJoinedList(
      payload.referenceUrls,
      "Referencias visuales por recabar (URLs o descripciones en briefing creativo)",
    ),
  };
}

export function eliteSeoIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return {
    ...eliteCommonIntakeStrings(payload),
    targetKeywords: asJoinedList(payload.targetKeywords, "Palabras clave objetivo por investigar con Ahrefs/SEMrush"),
    mainGoal: asTrimmedString(payload.mainGoal, "Objetivo SEO principal por consensuar con negocio"),
    currentWebsiteUrl: asTrimmedString(payload.currentWebsiteUrl, "Sin URL de web actual informada"),
  };
}

export function eliteAdsIntakeStrings(payload: OsJobPayload): Record<string, string> {
  const mb = payload.monthlyBudget;
  const budgetStr =
    typeof mb === "number" && Number.isFinite(mb)
      ? String(mb)
      : typeof mb === "string" && mb.trim().length > 0
        ? mb.trim()
        : "Presupuesto mensual por definir con media planning";
  return {
    ...eliteCommonIntakeStrings(payload),
    adPlatforms: asJoinedList(payload.platforms, "Plataformas de pago por priorizar (Google, Meta, TikTok, LinkedIn)"),
    monthlyBudget: budgetStr,
    campaignGoal: asTrimmedString(payload.campaignGoal, "Objetivo de campaña por alinear con KPIs de negocio"),
  };
}

export function eliteSocialIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return {
    ...eliteCommonIntakeStrings(payload),
    socialPlatforms: asJoinedList(payload.platforms, "Redes sociales por priorizar (Instagram, LinkedIn, TikTok, etc.)"),
    postFrequency: asTrimmedString(payload.postFrequency, "Frecuencia de publicación por acordar en calendario"),
    contentStyle: asTrimmedString(payload.contentStyle, "Estilo visual preferido por definir con moodboard"),
  };
}
