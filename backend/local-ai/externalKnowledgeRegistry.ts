/**
 * Controlled external knowledge registry — provenance only.
 * Does NOT scrape or copy third-party content. Entries are allowlisted metadata
 * for human-approved incorporation into knowledge packs.
 */

export type ExternalKnowledgeRecord = {
  id: string;
  title: string;
  sourceUrl: string;
  publisher: string;
  fetchedAt: string | null;
  license: string;
  quality: "high" | "medium" | "low" | "unverified";
  relevance: "nelvyon_core" | "domain_support" | "optional";
  status: "proposed" | "approved" | "incorporated" | "rejected";
  notes: string;
};

/**
 * Seed registry — official/docs we may cite; not ingested as full text automatically.
 * Incorporating full text requires license review + manual knowledge pack update.
 */
export const EXTERNAL_KNOWLEDGE_REGISTRY: ExternalKnowledgeRecord[] = [
  {
    id: "ext_nextjs_docs",
    title: "Next.js Documentation",
    sourceUrl: "https://nextjs.org/docs",
    publisher: "Vercel",
    fetchedAt: null,
    license: "proprietary_docs_fair_use",
    quality: "high",
    relevance: "domain_support",
    status: "approved",
    notes: "Cite patterns; do not copy wholesale into RAG.",
  },
  {
    id: "ext_postgres_docs",
    title: "PostgreSQL Documentation",
    sourceUrl: "https://www.postgresql.org/docs/",
    publisher: "PostgreSQL Global Development Group",
    fetchedAt: null,
    license: "postgresql",
    quality: "high",
    relevance: "domain_support",
    status: "approved",
    notes: "RLS/vector ops reference only.",
  },
  {
    id: "ext_owasp",
    title: "OWASP Top 10",
    sourceUrl: "https://owasp.org/www-project-top-ten/",
    publisher: "OWASP",
    fetchedAt: null,
    license: "cc-by-sa",
    quality: "high",
    relevance: "domain_support",
    status: "approved",
    notes: "Security agent grounding; prefer NELVYON security docs first.",
  },
  {
    id: "ext_stripe_docs",
    title: "Stripe API Docs",
    sourceUrl: "https://docs.stripe.com",
    publisher: "Stripe",
    fetchedAt: null,
    license: "proprietary_docs",
    quality: "high",
    relevance: "nelvyon_core",
    status: "approved",
    notes: "Billing integration; never invent price IDs.",
  },
];

export function listApprovedExternalKnowledge(): ExternalKnowledgeRecord[] {
  return EXTERNAL_KNOWLEDGE_REGISTRY.filter((e) => e.status === "approved" || e.status === "incorporated");
}

export function assertNoIndiscriminateIngest(): { ok: true; policy: string } {
  return {
    ok: true,
    policy:
      "External full-text ingest is deny-by-default. Only NELVYON repo manifests enter RAG automatically.",
  };
}
