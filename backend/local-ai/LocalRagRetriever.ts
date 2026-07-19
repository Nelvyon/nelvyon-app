import { getLocalAiConfig } from "./config";
import { getLocalVectorStore, type RagChunk } from "./LocalVectorStore";
import type { KnowledgeDomainId } from "./specialization/ontology";

export type RagCitation = {
  sourceId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  score: number;
  domain?: string;
};

export type RagRetrievalResult = {
  query: string;
  expandedQuery: string;
  citations: RagCitation[];
  contextBlock: string;
  confidence: number;
  topK: number;
};

const MAX_CONTEXT_CHARS = 7000;

const DOMAIN_QUERY_EXPANSIONS: Partial<Record<KnowledgeDomainId, string[]>> = {
  nelvyon: ["NELVYON", "SaaS", "OS packs", "portal", "PRIVATE_MODE"],
  security_privacy: ["RLS", "tenant isolation", "PRIVATE_MODE", "pgvector"],
  business_strategy: ["OKR", "KPI", "unit economics", "CAC", "LTV"],
  digital_marketing: ["funnel", "ICP", "buyer persona", "CRO", "B2B"],
  paid_ads: ["Meta Ads", "Google Ads", "TikTok", "campaña", "audiencia", "SEM"],
  seo: ["crawl", "index", "Core Web Vitals", "auditoría técnica", "schema"],
  content: ["calendario editorial", "pillar", "repurposing", "lead magnet", "contenido B2B"],
  copywriting: ["AIDA", "PAS", "CTA", "headline", "objeciones"],
  social_media: ["LinkedIn", "calendario editorial", "crisis", "social listening", "community"],
  email_marketing: ["AWS SES", "SPF", "DKIM", "DMARC", "deliverability", "secuencia"],
  crm_sales: ["pipeline", "lead scoring", "forecast", "SPIN", "discovery"],
  automation: ["workflow", "trigger", "idempotencia", "webhook", "CRON"],
  saas: ["multi-tenant", "Stripe", "onboarding", "billing", "RLS"],
  analytics_reporting: ["KPI", "dashboard", "cohorte", "atribución", "funnel", "GA4"],
  customer_support: ["SLA", "ticket", "escalation", "CSAT", "knowledge base"],
  finance_operations: ["Stripe", "margen", "operaciones", "renewal", "onboarding cliente"],
  design: ["branding", "identidad visual", "UX", "WCAG", "SaasShellLayout"],
  video: ["guion", "hook", "subtítulos", "YouTube", "distribución"],
  development_tech: ["Next.js", "TypeScript", "Postgres", "FastAPI", "Railway", "stack NELVYON"],
  planning_strategy: ["plan estructurado", "roadmap", "contingencia", "16 secciones"],
};

/** Boost product-stack docs when query asks for NELVYON product technology (not local-ai ops). */
const PRODUCT_STACK_SOURCE_HINTS = ["CLAUDE.md", "platform.md", "ARCHITECTURE.md", "saas_analytics_tech.md"];
const LOCAL_AI_SOURCE_HINTS = ["local-ai/README.md", "PRIVATE_AI", "PHASE2_AI"];
const SAAS_ARCH_SOURCE_HINTS = [
  "PARITY_GHL",
  "platform.md",
  "saas_analytics",
  "ARCHITECTURE",
  "multi-tenant",
  "CLAUDE.md",
  "constitution",
];
const PACK_COMMERCIAL_HINTS = ["GROWTH_PACK", "servicePacks", "packOrchestrator", "kickoff", "local-business-growth"];
const OFFICIAL_NELVYON_HINTS = [
  "platform.md",
  "CLAUDE.md",
  "ARCHITECTURE",
  "knowledge/nelvyon",
  "constitution",
  "PARITY_GHL",
  "saas_analytics_tech",
  "DECISIONS",
  "HANDOVER",
  "AGENT_WORKFLOW",
  "AUTONOMOUS_WORKFORCE",
  "FINAL_ELITE",
  "entrepreneurship_ops",
];
const LOCAL_AI_OPS_HINTS = ["local-ai/README", "PHASE2_AI", "PRIVATE_AI"];
const KNOWLEDGE_PACK_PATH_HINTS = ["knowledge/domains/", "knowledge/nelvyon/"];
const OS_LEARNING_HINTS = ["os_learning"];
const LEARNING_QUERY_RE = /learning|seed|cvr|rankseeds|os_seed|os-learning/i;

function expandQuery(query: string, domain?: KnowledgeDomainId): string {
  const extras = domain ? (DOMAIN_QUERY_EXPANSIONS[domain] ?? []) : [];
  if (extras.length === 0) return query;
  return `${query} ${extras.join(" ")}`;
}

function isProductStackQuery(query: string): boolean {
  const q = query.toLowerCase();
  return /next\.?js|typescript|postgres|fastapi|stack|producto|saas.*stack|railway/i.test(q);
}

function isSaasArchitectureQuery(query: string): boolean {
  const q = query.toLowerCase();
  return /multi-tenant|multi tenant|\brls\b|aislamiento|tenant|saas.*arquitect/i.test(q);
}

function isNelvyonKnowledgeQuery(query: string, domain?: KnowledgeDomainId): boolean {
  return (
    domain === "nelvyon" ||
    domain === "development_tech" ||
    /nelvyon|multi-tenant|\brls\b|stripe|starter|pro|agency|stack|next\.?js|billing/i.test(query.toLowerCase())
  );
}

function isAnalyticsReportingQuery(query: string): boolean {
  return /dashboard|ejecutivo|operativo|kpi|reporting|cohorte|atribucion|funnel|ga4/i.test(query.toLowerCase());
}

function applyRetrievalBoosts(
  hits: RagChunk[],
  query: string,
  domain?: KnowledgeDomainId,
): RagChunk[] {
  const productQuery = domain === "development_tech" && isProductStackQuery(query);
  const saasArchQuery = (domain === "saas" || domain === "nelvyon") && isSaasArchitectureQuery(query);
  const analyticsQuery = domain === "analytics_reporting" && isAnalyticsReportingQuery(query);
  const nelvyonQuery = isNelvyonKnowledgeQuery(query, domain);
  const learningQuery = LEARNING_QUERY_RE.test(query);
  return hits.map((h) => {
    let score = h.score ?? 0;
    const sid = h.sourceId.toLowerCase();
    if (productQuery) {
      if (PRODUCT_STACK_SOURCE_HINTS.some((p) => sid.includes(p.toLowerCase().replace(/\\/g, "/")))) score += 0.12;
      if (LOCAL_AI_SOURCE_HINTS.some((p) => sid.includes(p.toLowerCase()))) score -= 0.15;
    }
    if (saasArchQuery) {
      if (SAAS_ARCH_SOURCE_HINTS.some((p) => sid.includes(p.toLowerCase()))) score += 0.14;
      if (PACK_COMMERCIAL_HINTS.some((p) => sid.includes(p.toLowerCase()))) score -= 0.12;
    }
    if (analyticsQuery) {
      if (sid.includes("saas_analytics")) score += 0.18;
      if (OS_LEARNING_HINTS.some((p) => sid.includes(p))) score -= 0.14;
    }
    if (!learningQuery && OS_LEARNING_HINTS.some((p) => sid.includes(p))) score -= 0.08;
    if (KNOWLEDGE_PACK_PATH_HINTS.some((p) => sid.includes(p))) score += 0.06;
    if (nelvyonQuery) {
      if (OFFICIAL_NELVYON_HINTS.some((p) => sid.includes(p.toLowerCase()))) score += 0.16;
      if (LOCAL_AI_OPS_HINTS.some((p) => sid.includes(p.toLowerCase()))) score -= 0.12;
      if (PACK_COMMERCIAL_HINTS.some((p) => sid.includes(p.toLowerCase()))) score -= 0.1;
    }
    if (domain && h.domain === domain) score += 0.08;
    return { ...h, score: Math.min(0.98, score) };
  });
}

function dynamicTopK(scores: number[], base = 6): number {
  if (scores.length === 0) return base;
  const top = scores[0] ?? 0;
  if (top >= 0.7) return Math.max(3, base - 2);
  if (top < 0.45) return Math.min(10, base + 3);
  return base;
}

export class LocalRagRetriever {
  async retrieve(
    tenantId: string,
    query: string,
    opts?: { limit?: number; domain?: KnowledgeDomainId; minScore?: number; clientId?: string | null },
  ): Promise<RagRetrievalResult> {
    const minScore = opts?.minScore ?? 0.32;
    const expandedQuery = expandQuery(query, opts?.domain);
    const store = getLocalVectorStore();

    const probe = await store.hybridSearch({
      tenantId,
      query: expandedQuery,
      limit: 16,
      domain: opts?.domain,
      clientId: opts?.clientId,
    });

    const boosted = applyRetrievalBoosts(probe, query, opts?.domain).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const topK = dynamicTopK(
      boosted.map((h) => h.score ?? 0),
      opts?.limit ?? 6,
    );

    const filtered = boosted.filter((h) => (h.score ?? 0) >= minScore).slice(0, topK);

    const citations: RagCitation[] = filtered.map((h) => ({
      sourceId: h.sourceId,
      documentId: h.documentId,
      chunkIndex: h.chunkIndex,
      content: h.content,
      score: h.score ?? 0,
      domain: h.domain,
    }));

    let contextBlock = "";
    for (let i = 0; i < citations.length; i++) {
      const c = citations[i]!;
      const block = `[${i + 1}] (${c.sourceId}, score=${c.score.toFixed(3)})\n${c.content}`;
      if (contextBlock.length + block.length > MAX_CONTEXT_CHARS) break;
      contextBlock = contextBlock ? `${contextBlock}\n\n---\n\n${block}` : block;
    }

    const avgScore =
      citations.length > 0 ? citations.reduce((s, c) => s + c.score, 0) / citations.length : 0;
    const confidence = Math.min(0.95, avgScore * 1.1);

    return { query, expandedQuery, citations, contextBlock, confidence, topK };
  }

  buildAugmentedPrompt(query: string, retrieval: RagRetrievalResult): string {
    return `CONTEXTO RAG NELVYON (fuentes locales autorizadas — PRIORIDAD ABSOLUTA):
${retrieval.contextBlock || "(sin contexto relevante)"}

PREGUNTA: ${query}

Instrucciones:
1. Prioriza este contexto sobre conocimiento general.
2. Cita fuentes como [1], [2].
3. Si el contexto es insuficiente, declara laguna (no inventes APIs, métricas ni arquitectura).
4. Confianza baja cuando no hay citas.`;
  }
}

let _retriever: LocalRagRetriever | undefined;
export function getLocalRagRetriever(): LocalRagRetriever {
  _retriever ??= new LocalRagRetriever();
  return _retriever;
}

export function resetLocalRagRetrieverForTests(): void {
  _retriever = undefined;
}
