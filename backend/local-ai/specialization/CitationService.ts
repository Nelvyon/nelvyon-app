import type { RagCitation } from "../LocalRagRetriever";

export type CitationValidation = {
  valid: boolean;
  violations: string[];
  indices: number[];
  invented: number[];
};

/** Validate [N] markers against allowed context indices and source IDs. */
export function validateCitations(response: string, citations: RagCitation[]): CitationValidation {
  const violations: string[] = [];
  const matches = [...response.matchAll(/\[(\d+)\]/g)];
  const indices = matches.map((m) => Number(m[1]));
  const max = citations.length;
  const invented = indices.filter((i) => i < 1 || i > max);
  if (invented.length) violations.push(`invented_index:${invented.join(",")}`);

  // Reject citations to filenames not in context (e.g. LOCAL_AI_MODEL.md)
  const allowedIds = new Set(citations.map((c) => c.sourceId.toLowerCase()));
  const fakeFileCites = [...response.matchAll(/\[(\d+)\]\s*\(?kb:[^)]+\)/gi)];
  for (const m of fakeFileCites) {
    const idx = Number(m[1]);
    const cite = citations[idx - 1];
    if (cite && !response.includes(cite.sourceId) && m[0].toLowerCase().includes("local_ai_model")) {
      violations.push("invented_source_file");
    }
  }

  // Orphan kb: references in text not matching retrieval set
  const kbRefs = [...response.matchAll(/kb:[a-z0-9_/-]+:[^\s,)]+/gi)];
  for (const ref of kbRefs) {
    const r = ref[0].toLowerCase();
    const known = [...allowedIds].some((id) => r.includes(id.split(":").pop() ?? "___"));
    if (!known && !allowedIds.has(r)) {
      const partial = [...allowedIds].some((id) => id.includes(r.replace("kb:", "").split(":")[0] ?? ""));
      if (!partial) violations.push(`unknown_kb_ref:${r.slice(0, 40)}`);
    }
  }

  return {
    valid: violations.length === 0 && (indices.length > 0 || max === 0),
    violations,
    indices,
    invented,
  };
}

/** Append structured sources block; ensure at least [1] when citations exist. */
export function enforceCitationStructure(response: string, citations: RagCitation[]): string {
  if (citations.length === 0) return response;

  let body = response.trim();
  const validation = validateCitations(body, citations);

  if (!/\[\d+\]/.test(body)) {
    body = `[1] ${body}`;
  }

  if (validation.invented.length) {
    for (const bad of validation.invented) {
      body = body.replace(new RegExp(`\\[${bad}\\]`, "g"), "[1]");
    }
  }

  const sourceLines = citations
    .slice(0, 6)
    .map((c, i) => `[${i + 1}] ${c.sourceId} (score=${c.score.toFixed(3)})`)
    .join("\n");

  if (!/##\s*Fuentes/i.test(body)) {
    body += `\n\n## Fuentes utilizadas\n${sourceLines}`;
  }

  return body;
}
