import type { RagCitation } from "../LocalRagRetriever";

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function queryTerms(query: string): string[] {
  return norm(query)
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["como", "cual", "para", "sobre", "que", "nelvyon"].includes(w));
}

/** Expand query terms from question intent (general patterns, not case-specific). */
function expandTermsForQuery(query: string, terms: string[]): string[] {
  const q = norm(query);
  const extra: string[] = [];
  if (/\bvs\b|versus|obligatori|prohibid/.test(q)) extra.push("invent", "prohibid", "medible", "nunca");
  if (/reporting|metric/.test(q)) extra.push("medible", "invent", "reporting", "metric", "roi");
  if (/lead magnet|magnet/.test(q)) extra.push("gated", "lead", "magnet", "contenido");
  if (/linkedin|formato|social/.test(q)) extra.push("carrusel", "carousel", "articulo", "thought");
  if (/roadmap|lanzamiento|plan/.test(q)) extra.push("roadmap", "lanzamiento", "fase", "hito", "semana");
  return [...new Set([...terms, ...extra])];
}

export type VerifiedFact = { index: number; text: string; score: number };

/** Extract top factual lines from RAG citations matching the user question (deterministic). */
export function extractVerifiedFacts(query: string, citations: RagCitation[], max = 5): VerifiedFact[] {
  const terms = expandTermsForQuery(query, queryTerms(query));
  if (terms.length === 0 || citations.length === 0) return [];

  const facts: VerifiedFact[] = [];
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]!;
    const lines = c.content
      .split(/\n|(?<=[.!?])\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 25 && l.length <= 400);

    for (const line of lines) {
      const ln = norm(line);
      const hits = terms.filter((t) => ln.includes(t)).length;
      if (hits === 0) continue;
      facts.push({ index: i + 1, text: line.replace(/\s+/g, " ").slice(0, 380), score: hits + c.score });
    }
  }

  return facts
    .sort((a, b) => b.score - a.score)
    .filter((f, idx, arr) => arr.findIndex((x) => x.text === f.text) === idx)
    .slice(0, max);
}

export function formatVerifiedFactsBlock(facts: VerifiedFact[]): string {
  if (facts.length === 0) return "";
  const lines = facts.map((f) => `- [${f.index}] ${f.text}`).join("\n");
  return `HECHOS VERIFICADOS (extraídos de FUENTES AUTORIZADAS — debes usarlos en la respuesta):\n${lines}\n\n`;
}
