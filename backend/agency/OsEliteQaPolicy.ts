/**
 * Elite QA policy — single quality bar for NELVYON OS (ADR-051).
 * Never lower OS_QA_MIN_SCORE (85). Critical deliverables use OS_CRITICAL_QA_MIN_SCORE (90).
 */

import { OS_QA_MIN_SCORE } from "./OsCapabilityRegistry";
import { OS_CRITICAL_QA_MIN_SCORE } from "./OsProfessionalTeams";

export type QaEliteDimension =
  | "technical"
  | "creative"
  | "business"
  | "brand"
  | "compliance"
  | "evidence";

export type QaRejectionCode =
  | "visual_defect"
  | "defective_copy"
  | "broken_link"
  | "unverified_data"
  | "mobile_fail"
  | "tracking_broken"
  | "false_promise"
  | "brand_incoherence"
  | "below_threshold"
  | "missing_evidence"
  | "self_approval_attempt";

export type QaEliteVerdict = {
  passed: boolean;
  score: number;
  threshold: number;
  critical: boolean;
  rejections: QaRejectionCode[];
  dimensions: Record<QaEliteDimension, { ok: boolean; note: string }>;
  requiresRepair: boolean;
  escalateToIndependentAuditor: boolean;
};

export const QA_ELITE_HARD_REJECTS: readonly QaRejectionCode[] = [
  "broken_link",
  "unverified_data",
  "false_promise",
  "tracking_broken",
  "self_approval_attempt",
] as const;

export function resolveQaThreshold(critical: boolean): number {
  return critical ? OS_CRITICAL_QA_MIN_SCORE : OS_QA_MIN_SCORE;
}

export function evaluateEliteQa(input: {
  score: number;
  critical?: boolean;
  flags?: Partial<Record<QaRejectionCode, boolean>>;
  dimensionNotes?: Partial<Record<QaEliteDimension, string>>;
  producerAttemptedSelfApprove?: boolean;
}): QaEliteVerdict {
  const critical = Boolean(input.critical);
  const threshold = resolveQaThreshold(critical);
  const rejections: QaRejectionCode[] = [];
  const flags = input.flags ?? {};

  for (const code of Object.keys(flags) as QaRejectionCode[]) {
    if (flags[code]) rejections.push(code);
  }
  if (input.score < threshold) rejections.push("below_threshold");
  if (input.producerAttemptedSelfApprove) rejections.push("self_approval_attempt");

  const hard = rejections.some((r) => QA_ELITE_HARD_REJECTS.includes(r));
  const dims: QaEliteDimension[] = [
    "technical",
    "creative",
    "business",
    "brand",
    "compliance",
    "evidence",
  ];
  const dimensions = Object.fromEntries(
    dims.map((d) => [
      d,
      {
        ok: !hard && input.score >= threshold,
        note: input.dimensionNotes?.[d] ?? (input.score >= threshold ? "ok" : "below_bar"),
      },
    ]),
  ) as QaEliteVerdict["dimensions"];

  const passed = !hard && input.score >= threshold && rejections.length === 0;
  return {
    passed,
    score: input.score,
    threshold,
    critical,
    rejections: [...new Set(rejections)],
    dimensions,
    requiresRepair: !passed,
    escalateToIndependentAuditor: critical || hard || input.score < OS_QA_MIN_SCORE,
  };
}

/** Regression registry: each fixed defect must keep a permanent check id. */
export type QaRegressionCheck = {
  id: string;
  defect: string;
  assertion: string;
  addedAt: string;
};

export const QA_ELITE_REGRESSION_SEED: readonly QaRegressionCheck[] = [
  {
    id: "reg-qa-threshold-85",
    defect: "Attempt to lower QA below 85",
    assertion: "OS_QA_MIN_SCORE === 85",
    addedAt: "2026-07-24",
  },
  {
    id: "reg-no-self-approve",
    defect: "Producer self-approving critical deliverable",
    assertion: "independent auditor forbids self_approve_critical",
    addedAt: "2026-07-24",
  },
  {
    id: "reg-no-mock-url",
    defect: "mock:// URLs in portal deliverables",
    assertion: "portal deliverables must not contain mock://",
    addedAt: "2026-07-24",
  },
] as const;
