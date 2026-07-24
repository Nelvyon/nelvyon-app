/**
 * Independent auditor gate for critical pack deliverables (ADR-051).
 * Default OFF — does not change certified pack auto-approve path until flagged.
 * Never allows producer self-approval of critical artifacts.
 */

import { evaluateEliteQa, type QaEliteVerdict } from "./OsEliteQaPolicy";

export function isPackIndependentAuditorEnabled(): boolean {
  const v = process.env.NELVYON_PACK_INDEPENDENT_AUDITOR?.trim();
  return v === "1" || v?.toUpperCase() === "ON" || v?.toLowerCase() === "true";
}

export type IndependentAuditInput = {
  packId: string;
  packRunId: string;
  workspaceId: number;
  avgQaScore: number;
  critical?: boolean;
  containsMockUrl?: boolean;
  producerRole?: string;
};

export type IndependentAuditResult = {
  enabled: boolean;
  skipped: boolean;
  verdict: QaEliteVerdict | null;
  blockPublish: boolean;
  reason: string;
};

/**
 * Fail-closed when enabled: missing evidence / mock URLs / low QA → block.
 * When disabled: skipped (certified path unchanged).
 */
export function runIndependentAuditor(input: IndependentAuditInput): IndependentAuditResult {
  if (!isPackIndependentAuditorEnabled()) {
    return {
      enabled: false,
      skipped: true,
      verdict: null,
      blockPublish: false,
      reason: "NELVYON_PACK_INDEPENDENT_AUDITOR=OFF (default)",
    };
  }

  const verdict = evaluateEliteQa({
    score: input.avgQaScore,
    critical: input.critical ?? true,
    flags: {
      unverified_data: input.avgQaScore <= 0,
      broken_link: false,
      ...(input.containsMockUrl ? { defective_copy: true } : {}),
    },
    producerAttemptedSelfApprove: input.producerRole === "specialist_only",
    dimensionNotes: {
      evidence: `pack=${input.packId} run=${input.packRunId} ws=${input.workspaceId}`,
    },
  });

  if (input.containsMockUrl) {
    return {
      enabled: true,
      skipped: false,
      verdict,
      blockPublish: true,
      reason: "mock:// forbidden in portal deliverables",
    };
  }

  return {
    enabled: true,
    skipped: false,
    verdict,
    blockPublish: !verdict.passed,
    reason: verdict.passed
      ? "independent_auditor_pass"
      : `independent_auditor_block:${verdict.rejections.join(",")}`,
  };
}
