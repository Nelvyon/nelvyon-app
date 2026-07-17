/**
 * Index synthetic corpus into InMemoryHybridRagStore and measure retrieval.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  InMemoryHybridRagStore,
  hashEmbed,
  type EmbedFn,
} from "./InMemoryHybridRagStore";
import { resolveSyntheticCorpusPath } from "./syntheticRagEval";

export type RetrievalMetrics = {
  precisionAtK: number;
  recallAtK: number;
  coverage: number;
  latencyMsP50: number;
  latencyMsP95: number;
  cases: Array<{
    query: string;
    expect: string;
    hit: boolean;
    topSourceId: string | null;
    latencyMs: number;
    via: string | null;
  }>;
  tenantIsolationOk: boolean;
  indexedChunks: number;
  mode: "hash" | "ollama";
};

type CorpusJson = {
  documents: Array<{ sourceId: string; content: string }>;
  cases: Array<{ query: string; expectContains: string }>;
};

function resolveCorpusJson(cwd = process.cwd()): string {
  const candidates = [
    join(cwd, "backend/local-ai/knowledge/eval/synthetic_corpus.json"),
    join(cwd, "../backend/local-ai/knowledge/eval/synthetic_corpus.json"),
    join(cwd, "../../backend/local-ai/knowledge/eval/synthetic_corpus.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0]!;
}

function loadCorpus(cwd?: string): CorpusJson {
  const jsonPath = resolveCorpusJson(cwd);
  if (existsSync(jsonPath)) {
    return JSON.parse(readFileSync(jsonPath, "utf8")) as CorpusJson;
  }
  // Fallback: parse markdown SSOT
  const mdPath = resolveSyntheticCorpusPath(cwd);
  const md = readFileSync(mdPath, "utf8").replace(/\r\n/g, "\n");
  const documents: CorpusJson["documents"] = [];
  const re = /### (doc-[a-z0-9-]+)\n([\s\S]*?)(?=\n### |\n## Eval|\n## Status|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    documents.push({ sourceId: m[1]!, content: m[2]!.trim() });
  }
  return {
    documents,
    cases: [
      { query: "tenant isolation RLS privacy", expectContains: "doc-nelvyon-privacy" },
      { query: "on-page SEO H1 title meta", expectContains: "doc-nelvyon-seo-basics" },
      { query: "support escalate billing ticket SLA", expectContains: "doc-nelvyon-support-sla" },
      { query: "CRM follow-up 14 days email call", expectContains: "doc-nelvyon-crm-followup" },
    ],
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

export async function indexAndEvaluateSyntheticCorpus(opts?: {
  cwd?: string;
  embed?: EmbedFn;
  mode?: "hash" | "ollama";
  tenantId?: string;
  k?: number;
}): Promise<{ store: InMemoryHybridRagStore; metrics: RetrievalMetrics }> {
  const tenantId = opts?.tenantId ?? "00000000-0000-0000-0000-0000000000aa";
  const otherTenant = "00000000-0000-0000-0000-0000000000bb";
  const k = opts?.k ?? 3;
  const mode = opts?.mode ?? "hash";
  const embed: EmbedFn = opts?.embed ?? (async (t) => hashEmbed(t));

  const corpus = loadCorpus(opts?.cwd);
  const store = new InMemoryHybridRagStore();

  for (const d of corpus.documents) {
    await store.upsertDocument({
      tenantId,
      documentId: d.sourceId,
      sourceId: d.sourceId,
      content: `${d.sourceId}\n${d.content}`,
      embed,
      metadata: { domain: "synthetic_eval" },
    });
  }

  await store.upsertDocument({
    tenantId: otherTenant,
    documentId: "doc-other-secret",
    sourceId: "doc-other-secret",
    content: "SECRET other tenant CRM pipeline billing export JWT",
    embed,
  });

  const latencies: number[] = [];
  const cases: RetrievalMetrics["cases"] = [];
  let hits = 0;

  for (const c of corpus.cases) {
    const t0 = performance.now();
    const results = await store.hybridSearch({
      tenantId,
      query: c.query,
      limit: k,
      embed,
    });
    const latencyMs = Math.round(performance.now() - t0);
    latencies.push(latencyMs);
    const top = results[0] ?? null;
    const hit = results.some(
      (r) => r.sourceId === c.expectContains || r.content.includes(c.expectContains),
    );
    if (hit) hits++;
    cases.push({
      query: c.query,
      expect: c.expectContains,
      hit,
      topSourceId: top?.sourceId ?? null,
      latencyMs,
      via: top?.via ?? null,
    });
  }

  const iso = await store.hybridSearch({
    tenantId,
    query: "SECRET other tenant billing JWT",
    limit: 5,
    embed,
  });
  const tenantIsolationOk = iso.every(
    (h) => h.tenantId === tenantId && h.sourceId !== "doc-other-secret",
  );

  const sorted = [...latencies].sort((a, b) => a - b);
  const precisionAtK = corpus.cases.length ? hits / corpus.cases.length : 0;
  const recallAtK = precisionAtK;
  const expectedDocs = corpus.documents.length;
  const coverage = expectedDocs > 0 ? Math.min(1, store.count(tenantId) / expectedDocs) : 0;

  return {
    store,
    metrics: {
      precisionAtK,
      recallAtK,
      coverage,
      latencyMsP50: percentile(sorted, 50),
      latencyMsP95: percentile(sorted, 95),
      cases,
      tenantIsolationOk,
      indexedChunks: store.count(tenantId),
      mode,
    },
  };
}

export function ragMetricsPass(m: RetrievalMetrics): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (m.precisionAtK < 0.75) reasons.push(`precisionAtK ${m.precisionAtK} < 0.75`);
  if (m.recallAtK < 0.75) reasons.push(`recallAtK ${m.recallAtK} < 0.75`);
  if (!m.tenantIsolationOk) reasons.push("tenant_isolation_failed");
  if (m.indexedChunks < 4) reasons.push("insufficient_chunks");
  if (m.mode === "ollama" && m.latencyMsP95 > 30_000) reasons.push(`latency_p95 ${m.latencyMsP95} > 30000`);
  return { ok: reasons.length === 0, reasons };
}
