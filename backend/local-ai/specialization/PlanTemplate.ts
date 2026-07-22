export const PLAN_SECTIONS = [
  "objetivo",
  "contexto",
  "diagnóstico",
  "hipótesis",
  "prioridades",
  "fases",
  "dependencias",
  "riesgos",
  "recursos",
  "calendario",
  "métricas",
  "criterios de aceptación",
  "escenarios",
  "contingencia",
  "fuentes",
  "confianza",
] as const;

export type PlanValidation = {
  ok: boolean;
  score: number;
  found: string[];
  missing: string[];
};

export function validatePlanSections(text: string): PlanValidation {
  const lower = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const found = PLAN_SECTIONS.filter((s) => {
    const n = s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return lower.includes(n) || lower.includes(`## ${n}`) || lower.includes(`### ${n}`);
  });
  const missing = PLAN_SECTIONS.filter((s) => !found.includes(s));
  const score = found.length / PLAN_SECTIONS.length;
  return { ok: score >= 0.85, score, found: [...found], missing: [...missing] };
}

export function planOutputSkeleton(): string {
  return PLAN_SECTIONS.map((s) => `## ${s.charAt(0).toUpperCase() + s.slice(1)}\n[completar]`).join("\n\n");
}

export function planPromptTemplate(planType: string, context: string): string {
  return `Crea un plan profesional de tipo "${planType}".

${context}

FORMATO OBLIGATORIO — usa exactamente estos encabezados ## y rellena cada sección:
${PLAN_SECTIONS.map((s) => `## ${s.charAt(0).toUpperCase() + s.slice(1)}`).join("\n")}

Incluye citas [1],[2] del contexto en Fuentes. En Confianza indica un número 0-1. No inventes métricas.`;
}

export const PLAN_MARKETING_TEMPLATE = planPromptTemplate(
  "marketing trimestral SaaS B2B",
  "Cliente: SaaS B2B español, lanzamiento Q3, presupuesto medio, canales email+LinkedIn.",
);

export const PLAN_MULTIDISCIPLINAR_TEMPLATE = planPromptTemplate(
  "lanzamiento multidisciplinar (SEO + email + paid ads)",
  "Objetivo: 50 leads cualificados en 90 días. Presupuesto 5000€. Equipo: 1 marketer + IA NELVYON.",
);
