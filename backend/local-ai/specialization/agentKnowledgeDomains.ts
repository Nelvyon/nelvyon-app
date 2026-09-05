/**
 * Agent → knowledge domain mapping (RAG filter hints).
 * Org domains (capabilityMatrix) stay separate; this maps Private AI agent ids → ontology.
 */

import type { KnowledgeDomainId } from "./ontology";

/** Primary domains preferred when assembling agent RAG context. */
export const AGENT_KNOWLEDGE_DOMAINS: Readonly<Record<string, readonly KnowledgeDomainId[]>> = {
  ceo_supervisor: ["nelvyon", "business_strategy", "planning_strategy", "saas"],
  cto: ["nelvyon", "development_tech", "security_privacy", "saas"],
  marketing: ["digital_marketing", "content", "copywriting", "social_media", "nelvyon"],
  product: ["nelvyon", "planning_strategy", "saas", "business_strategy"],
  operations: ["finance_operations", "automation", "nelvyon", "customer_support"],
  sales: ["crm_sales", "business_strategy", "digital_marketing"],
  crm: ["crm_sales", "email_marketing", "automation"],
  support: ["customer_support", "saas", "nelvyon"],
  seo: ["seo", "content", "digital_marketing"],
  google_ads: ["paid_ads", "digital_marketing", "analytics_reporting"],
  meta_ads: ["paid_ads", "social_media", "digital_marketing"],
  tiktok_ads: ["paid_ads", "social_media", "video"],
  email_marketing: ["email_marketing", "crm_sales", "copywriting"],
  content: ["content", "copywriting", "digital_marketing"],
  social_media: ["social_media", "content", "copywriting"],

  // Acotado a lo suyo: creatividad lee marca y contenido; reputacion lee
  // atencion al cliente y social, que es donde vive una resena.
  creative: ["content", "copywriting", "social_media", "video"],
  reputation: ["customer_support", "social_media", "content"],

  // Los seis especialistas de red. Cada uno hereda el conocimiento social y de
  // copy que necesita para redactar, y NADA mas: un especialista de Instagram no
  // tiene por que poder leer el conocimiento de CRM o de facturacion.
  //
  // Los de video llevan ademas `video`, que es donde vive el criterio de guion y
  // formato que las otras redes no usan.
  social_instagram: ["social_media", "content", "copywriting"],
  social_tiktok: ["social_media", "content", "copywriting", "video"],
  social_linkedin: ["social_media", "content", "copywriting", "business_strategy"],
  social_facebook: ["social_media", "content", "copywriting"],
  social_x: ["social_media", "content", "copywriting"],
  social_youtube: ["social_media", "content", "copywriting", "video"],
  workflows: ["automation", "saas", "crm_sales"],
  reporting: ["analytics_reporting", "saas", "nelvyon"],
  development: ["development_tech", "nelvyon", "saas"],
  qa: ["nelvyon", "development_tech", "planning_strategy"],
  devops: ["development_tech", "security_privacy", "nelvyon"],
  finance: ["finance_operations", "business_strategy", "saas"],
  portal_client: ["nelvyon", "customer_support", "saas"],
  security_compliance: ["security_privacy", "nelvyon", "development_tech"],
};

/** Agents that must have rag.search to consult the brain. */
export const AGENTS_REQUIRING_RAG = Object.keys(AGENT_KNOWLEDGE_DOMAINS);

export function knowledgeDomainsForAgent(agentId: string): KnowledgeDomainId[] {
  return [...(AGENT_KNOWLEDGE_DOMAINS[agentId] ?? ["nelvyon"])];
}

/** Primary domain hint for LocalRagRetriever filter (first mapped domain). */
export function primaryDomainHint(agentId: string): KnowledgeDomainId {
  return knowledgeDomainsForAgent(agentId)[0] ?? "nelvyon";
}
