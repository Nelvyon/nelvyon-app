import { CONSTITUTION_RULES } from "./constitution";

export type ValidationResult = {
  ok: boolean;
  score: number;
  violations: string[];
};

export function validateNoForbiddenPhrases(text: string): ValidationResult {
  const violations: string[] = [];
  for (const re of CONSTITUTION_RULES.forbiddenPhrases) {
    if (re.test(text)) violations.push(`forbidden:${re.source}`);
  }
  return { ok: violations.length === 0, score: violations.length === 0 ? 1 : 0, violations };
}

export function validateJsonOutput(text: string): ValidationResult {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    JSON.parse(cleaned);
    return { ok: true, score: 1, violations: [] };
  } catch {
    return { ok: false, score: 0, violations: ["invalid_json"] };
  }
}

export function validatePlanStructure(text: string): ValidationResult {
  const lower = text.toLowerCase();
  const missing = CONSTITUTION_RULES.requiredPlanSections.filter((s) => !lower.includes(s));
  const score = 1 - missing.length / CONSTITUTION_RULES.requiredPlanSections.length;
  return {
    ok: score >= 0.7,
    score,
    violations: missing.map((m) => `missing_section:${m}`),
  };
}

export function validateCitations(text: string, minCitations = 1): ValidationResult {
  const cites = (text.match(/\[\d+\]/g) ?? []).length;
  const score = Math.min(1, cites / minCitations);
  return {
    ok: cites >= minCitations,
    score,
    violations: cites < minCitations ? ["insufficient_citations"] : [],
  };
}

export function validateKeywordPresence(text: string, keywords: string[], minRatio = 0.5): ValidationResult {
  const lower = text.toLowerCase();
  const found = keywords.filter((k) => lower.includes(k.toLowerCase()));
  const score = found.length / keywords.length;
  return {
    ok: score >= minRatio,
    score,
    violations: score < minRatio ? [`keywords:${found.length}/${keywords.length}`] : [],
  };
}

export function validateNoSecrets(text: string): ValidationResult {
  const patterns = [/sk_live_/, /sk_test_/, /AKIA[0-9A-Z]{16}/, /password\s*=\s*\S+/i];
  const violations = patterns.filter((p) => p.test(text)).map((p) => `secret:${p.source}`);
  return { ok: violations.length === 0, score: violations.length === 0 ? 1 : 0, violations };
}
