import { describe, expect, it } from "vitest";

import {
  PROMPT_BRIEF_ANALYSIS,
  PROMPT_CONTENT_GENERATION,
  PROMPT_DELIVERY_REPORT,
  PROMPT_DESIGN_PROPOSAL,
  PROMPT_QA_CHECKLIST,
  PROMPT_SEO_SETUP,
  buildPrompt,
} from "../agents/webPremiumPrompts";
import { LLM_DEFAULT_MAX_TOKENS, LLM_DEFAULT_MODEL } from "../LlmClient";

function collectPlaceholders(template: string): string[] {
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(template)) !== null) {
    const k = m[1];
    if (k && !seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }
  return keys;
}

describe("webPremiumPrompts", () => {
  it("a) todos los prompts contienen los placeholders correctos", () => {
    expect(collectPlaceholders(PROMPT_BRIEF_ANALYSIS).sort()).toEqual(
      ["brief", "clientName", "competitors", "industry", "targetAudience", "tone"].sort(),
    );
    expect(collectPlaceholders(PROMPT_DESIGN_PROPOSAL).sort()).toEqual(
      ["primaryColor", "referenceUrls", "secondaryColor", "step1Result"].sort(),
    );
    expect(collectPlaceholders(PROMPT_CONTENT_GENERATION).sort()).toEqual(["pages", "step1Result", "step2Result"].sort());
    expect(collectPlaceholders(PROMPT_SEO_SETUP).sort()).toEqual(["step1Result", "step3Result"].sort());
    expect(collectPlaceholders(PROMPT_QA_CHECKLIST).sort()).toEqual(
      ["step1Result", "step2Result", "step3Result", "step4Result"].sort(),
    );
    expect(collectPlaceholders(PROMPT_DELIVERY_REPORT).sort()).toEqual(
      ["clientName", "step1Result", "step2Result", "step3Summary", "step4Result", "step5Result"].sort(),
    );
  });

  it("b) buildPrompt(PROMPT_BRIEF_ANALYSIS, vars) sustituye {clientName} correctamente", () => {
    const out = buildPrompt(PROMPT_BRIEF_ANALYSIS, {
      clientName: "Orbit Labs",
      industry: "SaaS",
      targetAudience: "CTOs",
      tone: "profesional",
      competitors: "A, B, C",
      brief: "Lanzamiento Q3",
    });
    expect(out).toContain("Orbit Labs");
    expect(out).not.toContain("{clientName}");
    expect(out).not.toContain("{industry}");
    expect(out).toContain("SaaS");
    expect(out).toContain("Lanzamiento Q3");
  });

  it("c) el modelo por defecto de LlmClient es gpt-4o", () => {
    expect(LLM_DEFAULT_MODEL).toBe("gpt-4o");
  });

  it("d) maxTokens default es 4000", () => {
    expect(LLM_DEFAULT_MAX_TOKENS).toBe(4000);
  });
});
