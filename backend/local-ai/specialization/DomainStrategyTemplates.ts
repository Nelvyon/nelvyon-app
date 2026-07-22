import type { KnowledgeDomainId } from "./ontology";

const STRATEGY_SECTIONS = [
  "Diagnóstico",
  "Objetivo",
  "Hipótesis",
  "Prioridades",
  "Fases",
  "Acciones",
  "Dependencias",
  "Riesgos",
  "Métricas permitidas",
  "Criterios de aceptación",
  "Fuentes",
  "Confianza",
] as const;

const DOMAIN_INTROS: Partial<Record<KnowledgeDomainId, string>> = {
  seo: "Eres experto SEO técnico y on-page NELVYON. Responde solo con FUENTES AUTORIZADAS.",
  analytics_reporting:
    "Eres experto analítica y reporting B2B NELVYON. Prohibido inventar algoritmos o funciones no presentes en fuentes.",
  copywriting: "Eres experto copywriting B2B NELVYON. Responde con frameworks PAS/AIDA/CTA del contexto.",
  saas: "Eres experto arquitectura SaaS multi-tenant NELVYON: RLS, aislamiento, billing Stripe, producto real — NO packs comerciales salvo que la pregunta lo pida.",
  finance_operations:
    "Eres experto finanzas y operaciones agencia NELVYON. CAC/LTV solo con datos del contexto; si faltan, indica qué falta sin inventar.",
  digital_marketing:
    "Eres estratega marketing digital B2B NELVYON. Distingue métricas reportables vs prohibidas según contexto.",
  content: "Eres experto contenido B2B NELVYON. Responde con calendario editorial, pillar y QA del contexto.",
  social_media: "Eres experto social media B2B NELVYON. Responde con calendario, crisis y listening del contexto.",
  email_marketing: "Eres experto email marketing NELVYON (SES, deliverability). Responde solo con fuentes.",
  design: "Eres experto diseño/UX NELVYON. Responde con branding, WCAG y SaasShellLayout del contexto.",
  business_strategy: "Eres estratega de negocio B2B NELVYON. Prioriza contexto RAG sobre suposiciones.",
  customer_support: "Eres experto soporte/CS NELVYON. SLA, tickets y CSAT solo desde fuentes.",
};

export function strategyExpertIntro(domain: KnowledgeDomainId): string | undefined {
  return DOMAIN_INTROS[domain];
}

/** @deprecated Use StrategyPromptBuilder + intent classifier */
export function strategyTemplateForDomain(domain: KnowledgeDomainId): string | undefined {
  const intro = DOMAIN_INTROS[domain];
  if (!intro) return undefined;
  const sections = STRATEGY_SECTIONS.map((s) => `- ${s}`).join("\n");
  return `${intro}

Responde con esta estructura (encabezados ##):
${sections}

Reglas:
- Cada afirmación factual lleva cita [N] de FUENTES AUTORIZADAS.
- Prohibido decir que no hay contexto si FUENTES AUTORIZADAS no está vacío.
- Confianza: número 0-1 al final.`;
}

export function requiresStrategyTemplate(domain: KnowledgeDomainId, gateCategory: string): boolean {
  if (gateCategory !== "strategy") return gateCategory === "nelvyon" || gateCategory === "citations";
  return Boolean(DOMAIN_INTROS[domain]);
}
