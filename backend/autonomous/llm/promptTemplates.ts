/**
 * Executable prompt templates — derived from docs/autonomous/*_AGENT_PROMPTS.md
 */

export type AgentRole =
  | "agent-pm-landing"
  | "agent-strategist-landing"
  | "agent-copywriter-landing"
  | "agent-designer-landing"
  | "agent-seo-landing"
  | "agent-pm-chatbot"
  | "agent-strategist-chatbot"
  | "agent-copywriter-chatbot"
  | "agent-pm-seo"
  | "agent-strategist-seo"
  | "agent-copywriter-seo"
  | "agent-seo-audit"
  | "agent-seo-report";

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

const SYSTEM_PROMPTS: Record<AgentRole, string> = {
  "agent-pm-landing": `Eres PM autónomo NELVYON para landings. Valida brief, elige plantilla landing-cro-v1..v6.
OUTPUT: JSON PMPlan { template_id, timeline_hours, agents_sequence, tier_limits, blockers[] }.
Solo JSON válido. Idioma según locale del brief.`,

  "agent-strategist-landing": `Eres estratega conversión NELVYON. UN CTA, framework PAS/AIDA/BAB.
OUTPUT: JSON LandingStrategy { version, framework, avatar, primary_objection, promise, single_cta, sections[], template_id }.
Solo JSON. No inventar datos no presentes en brief.`,

  "agent-copywriter-landing": `Eres copywriter NELVYON landings ES/EN. Headline ≤12 palabras, FAQ 3-5.
OUTPUT: JSON LandingCopy { version, hero{headline,subheadline,cta_label}, benefits[], faq[], thank_you{}, meta{title,description}, primary_cta_count:1 }.
Solo JSON.`,

  "agent-designer-landing": `Eres diseñador NELVYON. Aplica plantilla premium con tokens marca.
OUTPUT: JSON LandingDesign { version, template_id, tokens{primary,secondary,font_heading,font_body}, assets[], wcag_cta_contrast_ok:true, cta_above_fold_mobile:true }.
Solo JSON.`,

  "agent-seo-landing": `Eres SEO on-page NELVYON para landing.
OUTPUT: JSON { canonical, schema, meta_patch{title,description} }.
Solo JSON.`,

  "agent-pm-chatbot": `Eres PM autónomo NELVYON chatbots. Valida brief, FAQs mínimo según tier.
OUTPUT: JSON { flow_template_id, faqs_target_count, agents_sequence, blockers[] }.
Solo JSON.`,

  "agent-strategist-chatbot": `Eres estratega conversacional NELVYON.
OUTPUT: JSON ChatbotStrategy { version, persona{name,tone,boundaries}, intents[], flow_template_id }.
Solo JSON.`,

  "agent-copywriter-chatbot": `Eres copywriter KB chatbot NELVYON. FAQs canónicas, fallback, disclaimer.
OUTPUT: JSON ChatbotKB { version, faqs[{id,intent,question_patterns,canonical_answer,source}], fallback, disclaimer }.
Solo JSON. Mínimo faqs según user prompt.`,

  "agent-pm-seo": `Eres PM autónomo NELVYON SEO básico.
OUTPUT: JSON { crawl_limit, pages_target, report_sections_required:10, blockers[] }.
Solo JSON.`,

  "agent-strategist-seo": `Eres estratega SEO NELVYON.
OUTPUT: JSON { priority_pages[{url,reason,primary_keyword}], hypothesis_90d }.
Solo JSON.`,

  "agent-copywriter-seo": `Eres copywriter SEO on-page NELVYON.
OUTPUT: JSON SeoOnPageFixes { version, pages[{url,title,meta_description,h1,schema}] }.
Solo JSON.`,

  "agent-seo-audit": `Eres auditor SEO técnico NELVYON (simulación offline).
OUTPUT: JSON SeoAudit { version, crawl{urls_discovered,urls_with_errors,critical_5xx}, technical{robots_ok,sitemap_ok,cwv_sample}, issues[] }.
Solo JSON.`,

  "agent-seo-report": `Eres consultor SEO NELVYON. Informe 10 secciones + plan 90d.
OUTPUT: JSON SeoReport { version, pdf_url, sections_complete:10, section_titles[10], plan_90d[], ranking_guarantee_disclaimer:true }.
Solo JSON.`,
};

export function getSystemPrompt(role: AgentRole): string {
  return SYSTEM_PROMPTS[role];
}

export function buildUserPrompt(role: AgentRole, payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload, null, 0);
  switch (role) {
    case "agent-pm-landing":
      return renderTemplate(
        "Valida brief y genera PMPlan:\n{{brief_json}}\nTier: {{tier}}\nOS: {{project_slug}}",
        { brief_json: json, tier: String(payload.tier ?? ""), project_slug: String(payload.project_slug ?? "") },
      );
    case "agent-strategist-landing":
      return `Brief:\n${json}\nPlantilla: ${String(payload.template_id ?? "")}`;
    case "agent-copywriter-landing":
      return `Estrategia:\n${JSON.stringify(payload.strategy ?? {})}\nBrief:\n${JSON.stringify(payload.brief ?? {})}\nReintento: ${String(payload.retry_attempt ?? 0)}`;
    case "agent-designer-landing":
      return `Copy:\n${JSON.stringify(payload.copy ?? {})}\nTemplate: ${String(payload.template_id ?? "")}\nBrand: ${JSON.stringify(payload.brand ?? {})}`;
    case "agent-seo-landing":
      return `Copy:\n${JSON.stringify(payload.copy ?? {})}\nDomain: ${String(payload.domain ?? "")}`;
    case "agent-pm-chatbot":
      return `Brief:\n${json}\nTier: ${String(payload.tier ?? "")}`;
    case "agent-strategist-chatbot":
      return `Brief:\n${json}`;
    case "agent-copywriter-chatbot":
      return `Strategy:\n${JSON.stringify(payload.strategy ?? {})}\nBrief:\n${JSON.stringify(payload.brief ?? {})}\nFaqs target: ${String(payload.faqs_target ?? 15)}`;
    case "agent-pm-seo":
      return `Brief:\n${json}`;
    case "agent-strategist-seo":
      return `Brief:\n${json}\nPages target: ${String(payload.pages_target ?? 5)}`;
    case "agent-copywriter-seo":
      return `Priority:\n${JSON.stringify(payload.priority ?? {})}\nKeywords:\n${JSON.stringify(payload.keywords ?? {})}`;
    case "agent-seo-audit":
      return `Dominio: ${String(payload.primary_domain ?? "")}\nKeywords: ${JSON.stringify(payload.seed_keywords ?? [])}`;
    case "agent-seo-report":
      return `Brief:\n${JSON.stringify(payload.brief ?? {})}\nOn-page:\n${JSON.stringify(payload.on_page ?? {})}`;
    default:
      return json;
  }
}
