/**
 * Synthetic RAG eval — deterministic checks without requiring vector index ops.
 * Full retrieval precision needs LocalVectorStore ingest (ops / future block).
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type SyntheticRagCase = {
  query: string;
  expectContains: string;
};

export const SYNTHETIC_RAG_CASES: SyntheticRagCase[] = [
  { query: "tenant isolation RLS", expectContains: "doc-nelvyon-privacy" },
  { query: "on-page SEO H1 title", expectContains: "doc-nelvyon-seo-basics" },
  { query: "support escalate billing", expectContains: "doc-nelvyon-support-sla" },
  { query: "CRM follow-up 14 days", expectContains: "doc-nelvyon-crm-followup" },
];

export function resolveSyntheticCorpusPath(cwd = process.cwd()): string {
  const candidates = [
    join(cwd, "backend/local-ai/knowledge/eval/SYNTHETIC_CORPUS.md"),
    join(cwd, "../backend/local-ai/knowledge/eval/SYNTHETIC_CORPUS.md"),
    join(cwd, "../../backend/local-ai/knowledge/eval/SYNTHETIC_CORPUS.md"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}

/** Lexical presence check against corpus markdown (pre-index gate). */
export function runSyntheticRagCorpusGate(cwd = process.cwd()): {
  ok: boolean;
  path: string;
  hits: Array<{ query: string; found: boolean }>;
} {
  const path = resolveSyntheticCorpusPath(cwd);
  if (!existsSync(path)) {
    return { ok: false, path, hits: [] };
  }
  const body = readFileSync(path, "utf8").toLowerCase();
  const hits = SYNTHETIC_RAG_CASES.map((c) => ({
    query: c.query,
    found: body.includes(c.expectContains.toLowerCase()),
  }));
  return { ok: hits.every((h) => h.found), path, hits };
}
