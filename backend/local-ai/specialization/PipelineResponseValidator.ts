import type { RagCitation } from "../LocalRagRetriever";
import { CONSTITUTION_RULES } from "./constitution";
import { validateCitations } from "./CitationService";
import { needsContextRetry } from "./ContextEnforcer";
import { responseIgnoresVerifiedFacts } from "./DirectAnswerFromContext";

export type PipelineQualityAssessment = {
  pass: boolean;
  fallbackReasons: string[];
  constitutionViolation?: string;
  citationInvalid?: boolean;
  contextIssue?: boolean;
};

export function assessPipelineResponse(
  response: string,
  opts: {
    query?: string;
    hasContext: boolean;
    requireCitations: boolean;
    citations: RagCitation[];
    requireJson?: boolean;
  },
): PipelineQualityAssessment {
  const fallbackReasons: string[] = [];

  if (opts.hasContext && needsContextRetry(response)) {
    fallbackReasons.push("context_incoherent");
  }

  if (opts.query && opts.hasContext && responseIgnoresVerifiedFacts(opts.query, response, opts.citations)) {
    fallbackReasons.push("facts_not_used");
  }

  if (opts.requireCitations && opts.citations.length > 0) {
    const cv = validateCitations(response, opts.citations);
    if (!/\[\d+\]/.test(response) || !cv.valid) {
      fallbackReasons.push("citations_invalid");
    }
  }

  for (const re of CONSTITUTION_RULES.forbiddenPhrases) {
    if (re.test(response)) {
      fallbackReasons.push(`constitution:${re.source}`);
      break;
    }
  }

  if (opts.hasContext && !opts.requireJson && response.length < 60) {
    fallbackReasons.push("response_too_short");
  }

  return {
    pass: fallbackReasons.length === 0,
    fallbackReasons,
    constitutionViolation: fallbackReasons.find((r) => r.startsWith("constitution:")),
    citationInvalid: fallbackReasons.includes("citations_invalid"),
    contextIssue: fallbackReasons.includes("context_incoherent"),
  };
}

/** One repair pass prompt when constitution forbids hype/secrets wording. */
export function buildConstitutionRepairSystem(baseSystem: string): string {
  return `${baseSystem}

REPARACIÓN OBLIGATORIA: Elimina frases prohibidas (100% garantizado, ROI garantizado, +300%).
No escribas nombres literales de variables de entorno (JWT_SECRET, STRIPE_SECRET, DATABASE_URL).
Usa descripciones genéricas: "secretos de Stripe", "credenciales de base de datos".`;
}
