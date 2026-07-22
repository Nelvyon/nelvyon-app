import type { RagCitation } from "../LocalRagRetriever";
import { evaluateSecurityGuard } from "../specialization/SecurityGuard";
import { assessPipelineResponse } from "../specialization/PipelineResponseValidator";
import { validateCitations } from "../specialization/CitationService";
import { parseToolJson } from "../specialization/JsonOutputService";
import { CONSTITUTION_RULES } from "../specialization/constitution";
import type { RouterTaskInput, RouterExecutionMeta } from "./types";

export type ValidationInput = {
  content: string;
  query: string;
  requireJson?: boolean;
  requireCitations?: boolean;
  citations?: RagCitation[];
  hasContext?: boolean;
};

export type ValidationResult = {
  pass: boolean;
  violations: string[];
  shouldFallback: boolean;
  fallbackReasons: string[];
};

export function validateRouterResponse(input: ValidationInput): ValidationResult {
  const violations: string[] = [];
  const fallbackReasons: string[] = [];

  if (/JWT_SECRET\s*[:=]|eyJ[a-zA-Z0-9_-]{20,}|sk_live_|sk_test_|DATABASE_URL\s*=/i.test(input.content)) {
    violations.push("secrets_leaked");
  }

  for (const re of CONSTITUTION_RULES.forbiddenPhrases) {
    if (re.test(input.content)) {
      violations.push(`constitution:${re.source}`);
      break;
    }
  }

  if (input.requireJson) {
    const parsed = parseToolJson(input.content);
    if (!parsed.ok) violations.push(`json_invalid:${parsed.error}`);
  }

  if (input.requireCitations && input.citations?.length) {
    const cv = validateCitations(input.content, input.citations);
    if (!/\[\d+\]/.test(input.content) || !cv.valid) violations.push("citations_invalid");
  }

  const assessment = assessPipelineResponse(input.content, {
    query: input.query,
    hasContext: Boolean(input.hasContext),
    requireCitations: Boolean(input.requireCitations),
    citations: input.citations ?? [],
    requireJson: Boolean(input.requireJson),
  });
  fallbackReasons.push(...assessment.fallbackReasons);

  const guard = evaluateSecurityGuard(input.content);
  if (guard.blocked) violations.push(`security_echo:${guard.category}`);

  const shouldFallback = fallbackReasons.length > 0 || violations.some((v) => v.startsWith("constitution:") || v === "citations_invalid");
  const pass = violations.length === 0 && assessment.pass;

  return { pass, violations, shouldFallback, fallbackReasons };
}

export function buildBlockedMeta(
  taskId: string,
  tenantId: string,
  partial: Partial<RouterExecutionMeta>,
): RouterExecutionMeta {
  return {
    taskId,
    tenantId,
    taskType: partial.taskType ?? "simple",
    risk: partial.risk ?? "low",
    initialModel: partial.initialModel ?? "none",
    finalModel: partial.finalModel ?? "none",
    modelReason: partial.modelReason ?? "blocked",
    fallbackUsed: false,
    fallbackReasons: [],
    durationMs: partial.durationMs ?? 0,
    temperature: 0.15,
    ragSources: [],
    validationPass: true,
    validationViolations: [],
    securityBlocked: partial.securityBlocked ?? true,
    ...partial,
  };
}
