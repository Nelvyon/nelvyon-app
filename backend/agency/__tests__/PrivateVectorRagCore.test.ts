import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PRIVATE_RAG_ROLLBACK_FLAGS,
  PRIVATE_VECTOR_RAG_STATUS,
  PrivateVectorRagCore,
  assertPrivateVectorRagCoreIntegrity,
  cosineSimilarity,
  getPrivateVectorRagCore,
  hashEmbed,
  resetPrivateVectorRagCoreForTests,
} from "../PrivateVectorRagCore";

const TENANT_A = "synthetic-tenant-a";
const TENANT_B = "synthetic-tenant-b";

function ingestSyntheticFixtures(core: PrivateVectorRagCore): void {
  core.ingest({
    id: "doc-a-pricing",
    tenantId: TENANT_A,
    sourceId: "tenant-a/pricing.md",
    content:
      "NELVYON tenant A ofrece un plan Starter a 49 euros al mes con soporte por email y hasta 500 contactos CRM.",
  });
  core.ingest({
    id: "doc-a-onboarding",
    tenantId: TENANT_A,
    sourceId: "tenant-a/onboarding.md",
    content:
      "El proceso de onboarding del tenant A incluye una llamada inicial, configuracion del CRM y una campana de bienvenida por email.",
  });
  core.ingest({
    id: "doc-b-pricing",
    tenantId: TENANT_B,
    sourceId: "tenant-b/pricing.md",
    content:
      "NELVYON tenant B ofrece un plan Enterprise a 999 euros al mes con soporte dedicado 24x7 y contactos ilimitados.",
  });
  core.ingest({
    id: "doc-b-security",
    tenantId: TENANT_B,
    sourceId: "tenant-b/security.md",
    content:
      "El tenant B exige autenticacion multifactor obligatoria y auditoria trimestral de accesos administrativos.",
  });
}

describe("PrivateVectorRagCore — hashing-trick embeddings (real geometric vectors)", () => {
  it("hashEmbed is deterministic — same text always produces the same vector", () => {
    const a = hashEmbed("plan starter 49 euros crm");
    const b = hashEmbed("plan starter 49 euros crm");
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("hashEmbed returns an L2-normalized Float32Array", () => {
    const v = hashEmbed("contenido de ejemplo con varias palabras distintas");
    expect(v).toBeInstanceOf(Float32Array);
    let normSq = 0;
    for (let i = 0; i < v.length; i++) normSq += v[i]! * v[i]!;
    expect(Math.sqrt(normSq)).toBeCloseTo(1, 5);
  });

  it("cosineSimilarity of a vector with itself is 1 (real geometric property)", () => {
    const v = hashEmbed("nelvyon private rag synthetic tenant");
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it("cosineSimilarity rewards shared vocabulary and is not a keyword-substring shortcut", () => {
    const base = hashEmbed("plan starter 49 euros contactos crm email soporte");
    const related = hashEmbed("el plan starter cuesta 49 euros e incluye contactos en el crm");
    const unrelated = hashEmbed("auditoria trimestral de accesos administrativos multifactor");
    const relatedScore = cosineSimilarity(base, related);
    const unrelatedScore = cosineSimilarity(base, unrelated);
    expect(relatedScore).toBeGreaterThan(unrelatedScore);
    expect(relatedScore).toBeGreaterThan(0.2);
  });

  it("throws on dimension mismatch instead of silently comparing garbage", () => {
    const a = hashEmbed("x", 64);
    const b = hashEmbed("y", 32);
    expect(() => cosineSimilarity(a, b)).toThrow(/dim_mismatch/);
  });
});

describe("PrivateVectorRagCore — ingest + retrieve + citations", () => {
  let core: PrivateVectorRagCore;

  beforeEach(() => {
    core = new PrivateVectorRagCore();
    ingestSyntheticFixtures(core);
  });

  it("ingest reports chunk count and tracks metrics", () => {
    const metrics = core.getMetrics();
    expect(metrics.ingestedDocuments).toBe(4);
    expect(metrics.ingestedChunks).toBeGreaterThanOrEqual(4);
    expect(metrics.tenantsActive).toBe(2);
  });

  it("retrieve returns relevant, scored citations for a matching query", () => {
    const result = core.retrieve(TENANT_A, "cual es el precio del plan starter en euros al mes");
    expect(result.refused).toBe(false);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0]!.sourceId).toBe("tenant-a/pricing.md");
    expect(result.citations.every((c) => c.score >= result.minScore)).toBe(true);
    // Scores must be sorted descending — real ranking, not insertion order.
    for (let i = 1; i < result.citations.length; i++) {
      expect(result.citations[i - 1]!.score).toBeGreaterThanOrEqual(result.citations[i]!.score);
    }
  });

  it("respects topK limiting", () => {
    const result = core.retrieve(TENANT_A, "email crm contactos", { topK: 1, minScore: 0 });
    expect(result.citations.length).toBeLessThanOrEqual(1);
  });

  it("buildAnswer cites sources by index and includes scores", () => {
    const retrieval = core.retrieve(TENANT_A, "precio plan starter euros");
    const answer = core.buildAnswer("precio plan starter euros", retrieval);
    expect(answer.refused).toBe(false);
    expect(answer.answer).toContain("[1]");
    expect(answer.citations.length).toBe(retrieval.citations.length);
  });
});

describe("PrivateVectorRagCore — refuse on no evidence (never fabricate)", () => {
  it("refuses with no_evidence_found when the tenant has no ingested documents", () => {
    const core = new PrivateVectorRagCore();
    const result = core.retrieve("empty-tenant", "cualquier pregunta sin contexto");
    expect(result.refused).toBe(true);
    expect(result.refusalReason).toBe("no_evidence_found");
    expect(result.citations).toEqual([]);
  });

  it("refuses when the query is unrelated enough to fall below minScore", () => {
    const core = new PrivateVectorRagCore();
    ingestSyntheticFixtures(core);
    const result = core.retrieve(TENANT_A, "xyzabc totalmente no relacionado qwerty", { minScore: 0.9 });
    expect(result.refused).toBe(true);
    expect(result.refusalReason).toBe("no_evidence_found");
  });

  it("refuses on invalid input (empty tenantId or query)", () => {
    const core = new PrivateVectorRagCore();
    expect(core.retrieve("", "algo").refusalReason).toBe("invalid_input");
    expect(core.retrieve("tenant-a", "").refusalReason).toBe("invalid_input");
  });

  it("buildAnswer surfaces an explicit refusal message, never a hallucinated answer", () => {
    const core = new PrivateVectorRagCore();
    const retrieval = core.retrieve("empty-tenant", "pregunta sin evidencia");
    const answer = core.buildAnswer("pregunta sin evidencia", retrieval);
    expect(answer.refused).toBe(true);
    expect(answer.citations).toEqual([]);
    expect(answer.answer).toMatch(/evidencia suficiente/i);
  });
});

describe("PrivateVectorRagCore — hard tenant isolation (A must never see B)", () => {
  let core: PrivateVectorRagCore;

  beforeEach(() => {
    core = new PrivateVectorRagCore();
    ingestSyntheticFixtures(core);
  });

  it("tenant A queries never return tenant B chunks, even for near-identical topics", () => {
    const result = core.retrieve(TENANT_A, "plan enterprise 999 euros soporte dedicado 24x7", {
      minScore: 0,
      topK: 10,
    });
    expect(result.citations.every((c) => c.sourceId.startsWith("tenant-a/"))).toBe(true);
    expect(result.citations.some((c) => c.sourceId.startsWith("tenant-b/"))).toBe(false);
  });

  it("tenant B queries never return tenant A chunks", () => {
    const result = core.retrieve(TENANT_B, "plan starter 49 euros email crm", { minScore: 0, topK: 10 });
    expect(result.citations.every((c) => c.sourceId.startsWith("tenant-b/"))).toBe(true);
  });

  it("HARD ASSERT: assertTenantIsolation reports ok for disjoint tenant buckets", () => {
    const verdict = core.assertTenantIsolation(TENANT_A, TENANT_B);
    expect(verdict.ok).toBe(true);
    expect(verdict.violation).toBeNull();
  });

  it("HARD ASSERT: chunk ids are namespaced by tenant and never collide across buckets", () => {
    const aAll = core.retrieve(TENANT_A, "plan starter onboarding email crm", { minScore: -1, topK: 100 });
    const bAll = core.retrieve(TENANT_B, "plan enterprise seguridad auditoria", { minScore: -1, topK: 100 });
    const aIds = new Set(aAll.citations.map((c) => c.chunkId));
    expect(bAll.citations.some((c) => aIds.has(c.chunkId))).toBe(false);
  });

  it("countChunks and listTenantIds only expose per-tenant counts, never aggregate leakage", () => {
    expect(core.countChunks(TENANT_A)).toBeGreaterThan(0);
    expect(core.countChunks(TENANT_B)).toBeGreaterThan(0);
    expect(core.countChunks("unknown-tenant")).toBe(0);
    expect(core.listTenantIds().sort()).toEqual([TENANT_A, TENANT_B].sort());
  });
});

describe("PrivateVectorRagCore — kill switch, observability, and rollback", () => {
  afterEach(() => {
    delete process.env.NELVYON_PRIVATE_VECTOR_RAG_DISABLED;
  });

  it("NELVYON_PRIVATE_VECTOR_RAG_DISABLED=1 forces every retrieve() to refuse", () => {
    const core = new PrivateVectorRagCore();
    ingestSyntheticFixtures(core);
    process.env.NELVYON_PRIVATE_VECTOR_RAG_DISABLED = "1";
    const result = core.retrieve(TENANT_A, "plan starter 49 euros");
    expect(result.refused).toBe(true);
    expect(result.refusalReason).toBe("rag_disabled");
  });

  it("metrics track ingests, retrievals, and refusal reasons distinctly", () => {
    const core = new PrivateVectorRagCore();
    ingestSyntheticFixtures(core);
    core.retrieve(TENANT_A, "plan starter 49 euros");
    core.retrieve("empty-tenant", "sin contexto alguno");
    process.env.NELVYON_PRIVATE_VECTOR_RAG_DISABLED = "1";
    core.retrieve(TENANT_A, "plan starter 49 euros");

    const metrics = core.getMetrics();
    expect(metrics.retrievalsTotal).toBe(3);
    expect(metrics.refusalsNoEvidence).toBe(1);
    expect(metrics.refusalsDisabled).toBe(1);
  });

  it("assertTenantIsolation increments isolation-check counters", () => {
    const core = new PrivateVectorRagCore();
    ingestSyntheticFixtures(core);
    core.assertTenantIsolation(TENANT_A, TENANT_B);
    expect(core.getMetrics().crossTenantIsolationChecks).toBe(1);
    expect(core.getMetrics().crossTenantDenials).toBe(0);
  });

  it("publishes a non-empty rollback flag list including the kill switch", () => {
    expect(PRIVATE_RAG_ROLLBACK_FLAGS.length).toBeGreaterThan(0);
    expect(PRIVATE_RAG_ROLLBACK_FLAGS.some((f) => f.flag.includes("NELVYON_PRIVATE_VECTOR_RAG_DISABLED"))).toBe(
      true,
    );
  });

  it("reset() clears chunks, documents, and metrics", () => {
    const core = new PrivateVectorRagCore();
    ingestSyntheticFixtures(core);
    core.reset();
    expect(core.getMetrics()).toEqual({
      ingestedChunks: 0,
      ingestedDocuments: 0,
      retrievalsTotal: 0,
      refusalsNoEvidence: 0,
      refusalsDisabled: 0,
      crossTenantIsolationChecks: 0,
      crossTenantDenials: 0,
      tenantsActive: 0,
    });
  });
});

describe("PrivateVectorRagCore — singleton accessor + honest status", () => {
  beforeEach(() => {
    resetPrivateVectorRagCoreForTests();
  });

  it("getPrivateVectorRagCore returns a stable singleton until reset", () => {
    const a = getPrivateVectorRagCore();
    const b = getPrivateVectorRagCore();
    expect(a).toBe(b);
    resetPrivateVectorRagCoreForTests();
    const c = getPrivateVectorRagCore();
    expect(c).not.toBe(a);
  });

  it("status is honest: synthetic core verified, production pgvector path prepared-off", () => {
    expect(PRIVATE_VECTOR_RAG_STATUS.syntheticCore).toBe("IMPLEMENTED_VERIFIED");
    expect(PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath).toBe("PREPARED_OFF");
    expect(PRIVATE_VECTOR_RAG_STATUS.note.toLowerCase()).not.toContain("pepito");
  });

  it("validates required inputs on ingest", () => {
    const core = new PrivateVectorRagCore();
    expect(() => core.ingest({ id: "d1", tenantId: "", sourceId: "s", content: "x" })).toThrow(
      /tenant_id_required/,
    );
    expect(() => core.ingest({ id: "", tenantId: "t1", sourceId: "s", content: "x" })).toThrow(
      /document_id_required/,
    );
    expect(() => core.ingest({ id: "d1", tenantId: "t1", sourceId: "s", content: "  " })).toThrow(
      /content_required/,
    );
  });
});

describe("PrivateVectorRagCore — integrity self-assertion", () => {
  it("passes assertPrivateVectorRagCoreIntegrity()", () => {
    expect(assertPrivateVectorRagCoreIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
