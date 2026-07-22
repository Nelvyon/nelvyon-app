import type { RagCitation } from "../LocalRagRetriever";

import { extractVerifiedFacts } from "./ContextFactExtractor";

import { needsContextRetry } from "./ContextEnforcer";



function norm(text: string): string {

  return text

    .toLowerCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "");

}



function queryTerms(query: string): string[] {

  return norm(query)

    .replace(/[^\w\sáéíóúüñ-]/g, " ")

    .split(/\s+/)

    .filter((w) => w.length > 3 && !["como", "cual", "para", "sobre", "que"].includes(w));

}



function bestLine(citation: RagCitation, terms: string[]): string | null {

  const lines = citation.content.split(/\n|\. /).map((l) => l.trim()).filter((l) => l.length > 20);

  let best: { line: string; hits: number } | null = null;

  for (const line of lines) {

    const ln = norm(line);

    const hits = terms.filter((t) => ln.includes(t)).length;

    if (hits >= 1 && (!best || hits > best.hits)) best = { line, hits };

  }

  return best?.line ?? null;

}



function missingQueryTermRatio(query: string, response: string): number {

  const terms = queryTerms(query);

  if (terms.length === 0) return 0;

  const respNorm = norm(response);

  return terms.filter((t) => !respNorm.includes(t)).length / terms.length;

}



/** Deterministic answer from RAG when model denies context or ignores verified facts. */

export function buildGroundedFallbackResponse(query: string, citations: RagCitation[]): string | null {

  if (citations.length === 0) return null;

  const facts = extractVerifiedFacts(query, citations, 6);

  if (facts.length === 0) return null;



  const body = facts.map((f) => `[${f.index}] ${f.text}`).join("\n");

  const sources = facts.map((f) => `[${f.index}]`).join(" ");

  return `Según FUENTES AUTORIZADAS:\n\n${body}\n\n## Fuentes utilizadas\n${sources}`;

}



/** Prepend direct answer from RAG when model output misses key query terms. */

export function supplementDirectAnswerFromContext(

  query: string,

  response: string,

  citations: RagCitation[],

): string {

  if (citations.length === 0) return response;

  if (needsContextRetry(response)) {

    const grounded = buildGroundedFallbackResponse(query, citations);

    if (grounded) return grounded;

  }



  const qn = norm(query).replace(/^[¿?¡!.\s]+/, "");

  const definitional = /^(que es|define|definicion|como funciona)/i.test(qn);

  const comparison = /\bvs\b| versus |diferencia |frente a |obligatori|prohibid/.test(norm(query));

  const missingRatio = missingQueryTermRatio(query, response);

  const needsSupplement = definitional || comparison || missingRatio >= 0.5;

  if (!needsSupplement) return response;



  const terms = queryTerms(query);

  if (terms.length === 0) return response;



  const respNorm = norm(response);

  const missingTerms = terms.filter((t) => !respNorm.includes(t));

  if (missingTerms.length === 0) return response;



  const directLines: string[] = [];

  for (let i = 0; i < citations.length; i++) {

    const line = bestLine(citations[i]!, terms);

    if (!line) continue;

    const lineNorm = norm(line);

    if (missingTerms.some((t) => lineNorm.includes(t))) {

      directLines.push(`[${i + 1}] ${line}`);

    }

  }



  if (directLines.length === 0) {

    const facts = extractVerifiedFacts(query, citations, 3);

    if (facts.length > 0) {

      return `## Respuesta directa\n${facts.map((f) => `[${f.index}] ${f.text}`).join("\n")}\n\n${response}`;

    }

    return response;

  }



  return `## Respuesta directa\n${directLines.join("\n")}\n\n${response}`;

}



/** True when verified facts exist but response ignores them (triggers 8B fallback). */

export function responseIgnoresVerifiedFacts(

  query: string,

  response: string,

  citations: RagCitation[],

): boolean {

  if (citations.length === 0) return false;

  const facts = extractVerifiedFacts(query, citations, 4);

  if (facts.length === 0) return false;

  const respNorm = norm(response);

  const used = facts.filter((f) => {

    const tokens = norm(f.text).split(/\s+/).filter((w) => w.length > 5);

    return tokens.some((t) => respNorm.includes(t));

  });

  return used.length === 0;

}

