/** Rule-based mock agents — no LLM, no external APIs */

import type { AgentLogEntry } from "../types";

function log(
  agent: string,
  outputArtifact: string,
  version: number,
  inputVersions: Record<string, number> = {},
): AgentLogEntry {
  const now = new Date().toISOString();
  return {
    agent,
    started_at: now,
    ended_at: now,
    input_artifact_versions: inputVersions,
    output_artifact: outputArtifact,
    output_version: version,
    model: "mock-rules-v1",
    tokens: 0,
    status: "success",
  };
}

const LANDING_TEMPLATES: Record<string, string> = {
  solar: "landing-cro-v3",
  dental: "landing-cro-v2",
  default: "landing-cro-v1",
};

export function runPmLanding(brief: Record<string, unknown>, tier: string) {
  const required = ["company_name", "sector", "value_proposition", "primary_cta", "domain"];
  const blockers: string[] = [];
  for (const key of required) {
    if (!brief[key] && key !== "domain") blockers.push(`missing:${key}`);
  }
  const domain = brief.domain as { host?: string } | undefined;
  if (!domain?.host) blockers.push("missing:domain.host");

  const sector = String(brief.sector ?? "default");
  return {
    plan: {
      template_id: LANDING_TEMPLATES[sector] ?? LANDING_TEMPLATES.default,
      timeline_hours: tier === "starter" ? 48 : 72,
      agents_sequence: ["strategist", "copywriter", "designer", "build", "seo", "qa"],
      tier_limits: { landings: 1, revisions_auto: 3 },
      blockers,
    },
    log: log("agent-pm", "plan", 1),
  };
}

export function runStrategistLanding(brief: Record<string, unknown>, templateId: string) {
  const strategy = {
    version: 1,
    framework: "PAS",
    avatar: `Cliente ${brief.sector} en ${(brief.target_geo as string) ?? "ES"}`,
    primary_objection: "No está claro el beneficio o el siguiente paso",
    promise: String(brief.value_proposition),
    single_cta: String(brief.primary_cta),
    sections: [
      { id: "hero", goal: "captar atención + CTA" },
      { id: "benefits", goal: "3 beneficios tangibles" },
      { id: "social_proof", goal: "testimonios" },
      { id: "faq", goal: "objeciones" },
      { id: "final_cta", goal: "cierre" },
    ],
    template_id: templateId,
  };
  return { strategy, log: log("agent-strategist", "strategy", 1) };
}

export function runCopywriterLanding(
  brief: Record<string, unknown>,
  strategy: Record<string, unknown>,
  version = 1,
) {
  const company = String(brief.company_name);
  const cta = String(strategy.single_cta ?? brief.primary_cta);
  const copy = {
    version,
    hero: {
      headline: `${company}: ${String(brief.value_proposition).slice(0, 60)}`,
      subheadline: `Solución profesional en ${brief.sector}. ${cta}.`,
      cta_label: cta,
    },
    benefits: [
      { title: "Resultados medibles", body: "Seguimiento desde el día uno." },
      { title: "Proceso claro", body: "Un solo CTA y formulario corto." },
      { title: "Equipo NELVYON", body: "QA automático antes de entrega." },
    ],
    faq: [
      { q: "¿Cuánto tarda?", a: "Entrega simulada en 48-72h laborables." },
      { q: "¿Qué incluye?", a: "Landing optimizada según tier contratado." },
      { q: "¿Hay soporte?", a: "Sí, según SLA del tier." },
    ],
    thank_you: {
      headline: "Gracias — te contactamos pronto",
      body: "Hemos recibido tu solicitud.",
    },
    meta: {
      title: `${company} | ${brief.sector}`.slice(0, 60),
      description: String(brief.value_proposition).slice(0, 155),
    },
    primary_cta_count: 1,
    regulated_disclaimer:
      (brief.compliance_flags as { regulated_sector?: boolean })?.regulated_sector === true
        ? "Información orientativa."
        : null,
  };
  return { copy, log: log("agent-copywriter", "copy", version, { strategy: 1 }) };
}

export function runDesignerLanding(
  brief: Record<string, unknown>,
  strategy: Record<string, unknown>,
  version = 1,
) {
  const brand = (brief.brand as Record<string, string>) ?? {};
  const host = (brief.domain as { host: string }).host;
  const design = {
    version,
    template_id: strategy.template_id,
    tokens: {
      primary: brand.primary_color ?? "#0F766E",
      secondary: brand.secondary_color ?? "#F59E0B",
      font_heading: "Inter",
      font_body: "Inter",
    },
    assets: [
      {
        slot: "hero_image",
        url: `https://${host}/assets/hero-mock.webp`,
        alt: `${brief.company_name} hero`,
      },
    ],
    wcag_cta_contrast_ok: true,
    cta_above_fold_mobile: true,
  };
  return { design, log: log("agent-designer", "design", version, { copy: 1 }) };
}

export function runBuildLandingMock(
  brief: Record<string, unknown>,
  copy: Record<string, unknown>,
  design: Record<string, unknown>,
) {
  const host = (brief.domain as { host: string }).host;
  const tracking = brief.tracking as Record<string, string> | undefined;
  const build = {
    version: 1,
    staging_url: `https://${host}`,
    builder_ref: "landing_builder_service",
    build_id: `mock_build_${Date.now()}`,
    lighthouse_mobile: 88,
    lcp_seconds: 2.1,
    form_submit_ok: true,
    https: true,
    console_errors: 0,
    responsive_breakpoints: [375, 768, 1280],
    pixel_fires_pageview: Boolean(tracking?.ga4_id || tracking?.meta_pixel_id || tracking?.google_ads_id),
    deliverable_pack_ready: true,
  };
  return { build, log: log("landing_builder_service", "build", 1, { design: 1, copy: 1 }) };
}

export function runSeoLandingPatch(copy: Record<string, unknown>, brief: Record<string, unknown>) {
  const host = (brief.domain as { host: string }).host;
  const patch = {
    canonical: `https://${host}/`,
    schema: { "@type": "WebPage", name: (copy.meta as { title: string }).title },
  };
  const merged = { ...copy, seo_patch: patch, version: (copy.version as number) ?? 1 };
  return { copy: merged, log: log("agent-seo", "copy", merged.version as number, { copy: 1 }) };
}

// --- Chatbot ---

export function runPmChatbot(brief: Record<string, unknown>, tier: string) {
  const minFaqs = tier === "starter" ? 15 : 30;
  const blockers: string[] = [];
  if (!brief.website_url) blockers.push("missing:website_url");
  if (!brief.bot_name) blockers.push("missing:bot_name");
  if (brief.openai_cost_bearer !== "client") blockers.push("openai_cost_bearer_must_be_client");
  return {
    plan: {
      flow_template_id: "faq-general",
      faqs_target_count: minFaqs,
      agents_sequence: ["strategist", "copywriter", "config", "qa"],
      blockers,
    },
    log: log("agent-pm", "plan", 1),
  };
}

export function runStrategistChatbot(brief: Record<string, unknown>) {
  const forbidden = (brief.forbidden_topics as string[]) ?? [];
  const strategy = {
    version: 1,
    persona: {
      name: brief.bot_name,
      tone: brief.tone ?? "cercano_profesional",
      boundaries: forbidden,
    },
    intents: [
      { id: "hours", priority: "high" },
      { id: "treatments_info", priority: "high" },
      { id: "book_appointment", priority: "high" },
      { id: "handoff_human", priority: "critical" },
    ],
    flow_template_id: "faq-general",
  };
  return { strategy, log: log("agent-strategist", "strategy", 1) };
}

export function runCopywriterChatbot(
  brief: Record<string, unknown>,
  strategy: Record<string, unknown>,
  faqsTarget: number,
  version = 1,
) {
  const disclaimer =
    (brief.compliance_flags as { disclaimer_required?: boolean })?.disclaimer_required === true
      ? "Información orientativa, no sustituye consulta profesional."
      : "Asistente automatizado NELVYON.";
  const baseFaqs = [
    {
      id: "faq_001",
      intent: "hours",
      question_patterns: ["horario", "abierto"],
      canonical_answer: `Consulta horarios en ${brief.website_url}.`,
      source: "mock",
    },
    {
      id: "faq_002",
      intent: "handoff_human",
      question_patterns: ["humano", "persona", "recepción"],
      canonical_answer: "Te derivo con el equipo. ¿Me dejas tu email?",
      source: "mock",
    },
  ];
  const faqs = [...baseFaqs];
  for (let i = faqs.length; i < faqsTarget; i++) {
    faqs.push({
      id: `faq_${String(i + 1).padStart(3, "0")}`,
      intent: "treatments_info",
      question_patterns: [`pregunta ${i + 1}`],
      canonical_answer: `Respuesta canónica mock ${i + 1} para ${brief.company_name}.`,
      source: "mock",
    });
  }
  const kb = {
    version,
    faqs,
    fallback: "No tengo esa información. ¿Quieres hablar con el equipo?",
    disclaimer,
    gold_set_useful_rate: 0.84,
    hallucination_price_check: true,
  };
  return { kb, log: log("agent-copywriter", "knowledge_base", version, { strategy: 1 }) };
}

export function runChatbotConfig(brief: Record<string, unknown>, kb: Record<string, unknown>) {
  const handoff = brief.handoff as { destination: string };
  const config = {
    version: 1,
    service_ref: "chatbot_service",
    bot_id: `mock_bot_${String(brief.company_name).replace(/\s/g, "_").toLowerCase()}`,
    system_prompt_hash: "sha256:mock_phase_b",
    widget_snippet: `<script data-nelvyon-bot="mock" data-company="${brief.company_name}"></script>`,
    lead_webhook: "mock://webhook/no-network",
    handoff_email: handoff.destination,
    widget_load_ok: true,
    webhook_delivers: true,
    p95_latency_ms: 1200,
    rgpd_notice: true,
    no_infinite_loop: true,
  };
  return { config, log: log("agent-pm", "config", 1, { knowledge_base: 1 }) };
}

// --- SEO ---

export function runPmSeo(brief: Record<string, unknown>) {
  const blockers: string[] = [];
  if (!brief.primary_domain) blockers.push("missing:primary_domain");
  if (!Array.isArray(brief.seed_keywords) || brief.seed_keywords.length < 5) {
    blockers.push("seed_keywords_min_5");
  }
  const ack = (brief.compliance_flags as { no_ranking_guarantee_ack?: boolean })?.no_ranking_guarantee_ack;
  if (!ack) blockers.push("no_ranking_guarantee_ack_required");
  return {
    plan: {
      crawl_limit: 50,
      pages_target: brief.pages_to_optimize ?? 5,
      report_sections_required: 10,
      blockers,
    },
    log: log("agent-pm", "plan", 1),
  };
}

export function runStrategistSeo(brief: Record<string, unknown>, pagesTarget: number) {
  const domain = String(brief.primary_domain).replace(/\/$/, "");
  const pages = Array.from({ length: pagesTarget }, (_, i) => ({
    url: i === 0 ? "/" : `/servicio-${i}`,
    reason: "Prioridad mock estratega",
    primary_keyword: (brief.seed_keywords as string[])[i % (brief.seed_keywords as string[]).length],
  }));
  return {
    priority: { priority_pages: pages, hypothesis_90d: "Mejora tráfico orgánico en 90d (simulación)" },
    log: log("agent-strategist", "priority", 1),
  };
}

export function runSeoAudit(brief: Record<string, unknown>) {
  const audit = {
    version: 1,
    crawl: { urls_discovered: 42, urls_with_errors: 0, critical_5xx: 0 },
    technical: {
      robots_ok: true,
      sitemap_ok: true,
      cwv_sample: { lcp_p75: 2.1, cls_p75: 0.05 },
    },
    issues: [
      {
        id: "ISS-001",
        priority: "P1",
        type: "missing_meta_description",
        url: "/servicios",
        fix_auto: true,
      },
    ],
  };
  return { audit, log: log("agent-seo", "audit", 1) };
}

export function runSeoKeywords(brief: Record<string, unknown>) {
  const seeds = brief.seed_keywords as string[];
  const keywords = seeds.map((kw, i) => ({
    keyword: kw,
    intent: i % 2 === 0 ? "transactional" : "informational",
    target_url: i === 0 ? "/" : `/servicio-${i}`,
    priority: i + 1,
  }));
  while (keywords.length < 10) {
    keywords.push({
      keyword: `${seeds[0]} alternativa ${keywords.length}`,
      intent: "commercial",
      target_url: "/",
      priority: keywords.length + 1,
    });
  }
  return {
    keywords: { version: 1, keywords, gap_vs_competitors: (brief.competitors as string[]) ?? [] },
    log: log("agent-seo", "keywords", 1),
  };
}

export function runCopywriterSeoOnPage(
  priority: Record<string, unknown>,
  keywords: Record<string, unknown>,
  version = 1,
) {
  const pages = (priority.priority_pages as Array<{ url: string; primary_keyword: string }>).map((p) => ({
    url: p.url,
    title: `${p.primary_keyword} | NELVYON mock`.slice(0, 60),
    meta_description: `Servicio ${p.primary_keyword}. Consulta sin compromiso.`.slice(0, 155),
    h1: p.primary_keyword,
    schema: { "@type": "LegalService", name: p.primary_keyword },
  }));
  return {
    on_page: { version, pages },
    log: log("agent-copywriter", "on_page_fixes", version),
  };
}

export function runSeoReport(brief: Record<string, unknown>, onPage: Record<string, unknown>) {
  const domain = String(brief.primary_domain).replace(/\/$/, "");
  const report = {
    version: 1,
    pdf_url: `mock://storage/${domain}/seo-report.pdf`,
    sections_complete: 10,
    section_titles: [
      "Resumen ejecutivo",
      "Metodología",
      "Salud técnica",
      "Indexación",
      "CWV",
      "Keywords",
      "On-page",
      "Competencia",
      "Plan 90d",
      "Anexos",
    ],
    plan_90d: Array.from({ length: 12 }, (_, i) => ({
      week: i + 1,
      action: `Acción SEO semana ${i + 1}`,
    })),
    ranking_guarantee_disclaimer: true,
    gsc_connected: (brief.gsc_oauth as { connected?: boolean })?.connected ?? false,
    pages_optimized: (onPage.pages as unknown[]).length,
  };
  return { report, log: log("agent-seo", "report", 1) };
}
