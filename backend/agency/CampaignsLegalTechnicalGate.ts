/**
 * Campaigns legal + technical readiness gate (ADR-053 extension, ADR-055 closure).
 * Technical readiness (source_trace, consent, unsubscribe/suppression list, rate limits,
 * audit log, SES presence) is code-verifiable. Legal readiness is NOT: `claimReadyLegal`
 * is hardcoded `false` and can only ever change via a manual code update after a real
 * written commercial license + legal review confirmation exist — never via a runtime
 * flag, input parameter, or environment variable.
 *
 * See `docs/ops/CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md` for the full checklist and rationale.
 * See `docs/ops/DATOS_PEPITO_LICENSE_DOSSIER.md` for the Pepito-specific legal dossier —
 * Pepito remains forbidden as a campaign source regardless of that dossier's outcome
 * unless this file is manually updated after written legal confirmation.
 */

import { isSesEnvConfigured } from "../saas/saasEnv";
import {
  auditEmailTemplate,
  checkUnsubscribeProof,
  buildWarmingMetadata,
  getSyntheticReputationScoreStub,
  type ReputationScoreSnapshot,
  type TemplateAuditInput,
  type UnsubscribeProofInput,
  type WarmingMetadata,
} from "./MassSendTechnicalControls";

export type CampaignsLegalTechnicalInput = {
  /** Every outbound message links back to its consent/source record. */
  sourceTraceImplemented: boolean;
  /** Opt-in/consent fields exist and are enforced before send. */
  consentFieldsImplemented: boolean;
  /** One-click unsubscribe + List-Unsubscribe header implemented. */
  unsubscribeImplemented: boolean;
  /** Suppression list (bounces/complaints/manual opt-outs) is checked before every send. */
  suppressionListImplemented: boolean;
  /** Every send attempt (sent/blocked/bounced) is written to an audit log. */
  auditLogImplemented: boolean;
  /** Declared send rate limit metadata (messages/hour). Must be a positive finite number. */
  sendRateLimitPerHourMax: number;
  /** Override for tests only — defaults to reading real env via `isSesEnvConfigured()`. */
  sesConfiguredOverride?: boolean;
  /** True if any code path references the forbidden "Pepito" demo/scraped DB — must never be true. */
  pepitoDbReferenced?: boolean;
  /** CEO + legal explicitly authorized THIS send (per-campaign, never a global always-on flag). */
  ceoLegalSendAuthorized?: boolean;
  /**
   * Optional additional technical hardening (ADR-055 extension) — purely informational,
   * surfaced in `checks` for visibility. None of these affect `technicalComplete` or
   * `sendAuthorized`: they reinforce the checklist but never substitute for it, and never
   * relax `claimReadyLegal`. See `MassSendTechnicalControls.ts`.
   */
  unsubscribeProof?: UnsubscribeProofInput;
  templateAudit?: TemplateAuditInput;
  /** ISO date the current IP/domain warm-up started, if warming is in progress. */
  warmingStartedAt?: string;
};

export type CampaignsLegalTechnicalResult = {
  technicalComplete: boolean;
  /** Always false in this codebase — never flip via input, env, or flag. */
  claimReadyLegal: false;
  /**
   * Hard send gate: requires technicalComplete AND explicit CEO+legal authorization for
   * THIS send. Even when true, `claimReadyLegal` staying false means no code path should
   * treat this as a legal green light — it only gates the technical/CEO layer.
   */
  sendAuthorized: boolean;
  blockers: string[];
  /** Always true — the Pepito demo/scraped DB is permanently forbidden as a campaign source. */
  pepitoDbForbidden: true;
  checks: {
    sourceTraceImplemented: boolean;
    consentFieldsImplemented: boolean;
    unsubscribeImplemented: boolean;
    suppressionListImplemented: boolean;
    auditLogImplemented: boolean;
    rateLimitDeclared: boolean;
    sendRateLimitPerHourMax: number | null;
    sesConfigured: boolean;
    pepitoDbClean: boolean;
    ceoLegalSendAuthorized: boolean;
    /** Informational technical reinforcement (ADR-055 extension) — never gates the send. */
    unsubscribeProofOk: boolean | null;
    templateAuditOk: boolean | null;
    templateAuditIssues: string[];
    warming: WarmingMetadata | null;
    reputationScoreSynthetic: ReputationScoreSnapshot;
  };
};

const LEGAL_BLOCKERS = [
  "legal_written_commercial_license_pending",
  "legal_review_confirmation_pending",
] as const;

const MAX_SANE_SEND_RATE_PER_HOUR = 100_000;

/**
 * Evaluates campaign send readiness. Technical items are derived from real inputs/env.
 * `claimReadyLegal` is NEVER set to true here — legal readiness requires a manual code
 * change after an actual written license + legal sign-off, documented in the checklist doc.
 */
export function evaluateCampaignsLegalTechnicalReadiness(
  input: CampaignsLegalTechnicalInput,
): CampaignsLegalTechnicalResult {
  const sesConfigured = input.sesConfiguredOverride ?? isSesEnvConfigured();
  const pepitoDbClean = !input.pepitoDbReferenced;
  const ceoLegalSendAuthorized = Boolean(input.ceoLegalSendAuthorized);
  const rateLimitDeclared =
    Number.isFinite(input.sendRateLimitPerHourMax) &&
    input.sendRateLimitPerHourMax > 0 &&
    input.sendRateLimitPerHourMax <= MAX_SANE_SEND_RATE_PER_HOUR;

  const blockers: string[] = [];
  if (!input.sourceTraceImplemented) blockers.push("source_trace_missing");
  if (!input.consentFieldsImplemented) blockers.push("consent_fields_missing");
  if (!input.unsubscribeImplemented) blockers.push("unsubscribe_missing");
  if (!input.suppressionListImplemented) blockers.push("suppression_list_missing");
  if (!input.auditLogImplemented) blockers.push("audit_log_missing");
  if (!rateLimitDeclared) blockers.push("send_rate_limit_missing_or_invalid");
  if (!sesConfigured) blockers.push("ses_not_configured");
  if (!pepitoDbClean) blockers.push("pepito_db_forbidden_reference_detected");
  if (!ceoLegalSendAuthorized) blockers.push("no_send_without_ceo_and_legal");
  blockers.push(...LEGAL_BLOCKERS);

  const technicalComplete =
    input.sourceTraceImplemented &&
    input.consentFieldsImplemented &&
    input.unsubscribeImplemented &&
    input.suppressionListImplemented &&
    input.auditLogImplemented &&
    rateLimitDeclared &&
    sesConfigured &&
    pepitoDbClean;

  const unsubscribeProofOk = input.unsubscribeProof ? checkUnsubscribeProof(input.unsubscribeProof).ok : null;
  const templateAuditResult = input.templateAudit ? auditEmailTemplate(input.templateAudit) : null;
  const warming = input.warmingStartedAt ? buildWarmingMetadata(input.warmingStartedAt) : null;

  return {
    technicalComplete,
    claimReadyLegal: false,
    sendAuthorized: technicalComplete && ceoLegalSendAuthorized,
    blockers: [...new Set(blockers)],
    pepitoDbForbidden: true,
    checks: {
      sourceTraceImplemented: input.sourceTraceImplemented,
      consentFieldsImplemented: input.consentFieldsImplemented,
      unsubscribeImplemented: input.unsubscribeImplemented,
      suppressionListImplemented: input.suppressionListImplemented,
      auditLogImplemented: input.auditLogImplemented,
      rateLimitDeclared,
      sendRateLimitPerHourMax: rateLimitDeclared ? input.sendRateLimitPerHourMax : null,
      sesConfigured,
      pepitoDbClean,
      ceoLegalSendAuthorized,
      unsubscribeProofOk,
      templateAuditOk: templateAuditResult?.ok ?? null,
      templateAuditIssues: templateAuditResult?.issues ?? [],
      warming,
      reputationScoreSynthetic: getSyntheticReputationScoreStub(),
    },
  };
}

/**
 * Test-only bypass: allows unit tests that exercise `launchCampania` (and similar
 * send-path code) to run without asserting real legal/technical readiness. NEVER
 * honored outside `NODE_ENV=test`/`VITEST=true` — production and staging always
 * evaluate real readiness, which is always blocked while `claimReadyLegal` is false.
 */
function isCampaignLaunchTestBypassActive(): boolean {
  const isTestRuntime = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  return isTestRuntime && process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS === "1";
}

/**
 * Hard launch gate for real campaign sends. Returns `null` only when the test bypass
 * is active (unit tests only). Otherwise evaluates real readiness with honest,
 * conservative defaults (nothing assumed `true` unless the input says so) and ALWAYS
 * returns a non-null block reason today, because `claimReadyLegal` is permanently
 * `false` until a manual code change follows a real written license + legal sign-off.
 * Also hard-blocks when `pepitoDbClean` is false (Pepito forbidden as campaign source).
 */
export function getCampaignLaunchBlockReason(
  input?: Partial<CampaignsLegalTechnicalInput>,
): string | null {
  if (isCampaignLaunchTestBypassActive()) return null;

  const result = evaluateCampaignsLegalTechnicalReadiness({
    sourceTraceImplemented: input?.sourceTraceImplemented ?? false,
    consentFieldsImplemented: input?.consentFieldsImplemented ?? false,
    unsubscribeImplemented: input?.unsubscribeImplemented ?? false,
    suppressionListImplemented: input?.suppressionListImplemented ?? false,
    auditLogImplemented: input?.auditLogImplemented ?? false,
    sendRateLimitPerHourMax: input?.sendRateLimitPerHourMax ?? 0,
    sesConfiguredOverride: input?.sesConfiguredOverride,
    pepitoDbReferenced: input?.pepitoDbReferenced ?? false,
    ceoLegalSendAuthorized: input?.ceoLegalSendAuthorized ?? false,
  });

  if (!result.checks.pepitoDbClean) {
    return `Campaign launch blocked: claimReadyLegal=false and pepitoDbClean=false — blockers: ${result.blockers.join(", ")}`;
  }
  if (!result.claimReadyLegal) {
    return `Campaign launch blocked: claimReadyLegal=false — blockers: ${result.blockers.join(", ")}`;
  }
  return null;
}

export function assertCampaignsLegalTechnicalGateIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const bestCase = evaluateCampaignsLegalTechnicalReadiness({
    sourceTraceImplemented: true,
    consentFieldsImplemented: true,
    unsubscribeImplemented: true,
    suppressionListImplemented: true,
    auditLogImplemented: true,
    sendRateLimitPerHourMax: 500,
    sesConfiguredOverride: true,
    pepitoDbReferenced: false,
    ceoLegalSendAuthorized: true,
  });
  if ((bestCase.claimReadyLegal as unknown) !== false) {
    violations.push("claim_ready_legal_must_always_be_false");
  }
  if (bestCase.pepitoDbForbidden !== true) violations.push("pepito_db_must_always_be_forbidden");
  if (!bestCase.technicalComplete) violations.push("best_case_should_reach_technical_complete");
  if (!bestCase.sendAuthorized) violations.push("best_case_should_reach_send_authorized");
  if (!bestCase.blockers.includes("legal_written_commercial_license_pending")) {
    violations.push("must_keep_legal_license_blocker");
  }
  if (!bestCase.blockers.includes("legal_review_confirmation_pending")) {
    violations.push("must_keep_legal_review_blocker");
  }

  const pepitoCase = evaluateCampaignsLegalTechnicalReadiness({
    sourceTraceImplemented: true,
    consentFieldsImplemented: true,
    unsubscribeImplemented: true,
    suppressionListImplemented: true,
    auditLogImplemented: true,
    sendRateLimitPerHourMax: 500,
    sesConfiguredOverride: true,
    pepitoDbReferenced: true,
    ceoLegalSendAuthorized: true,
  });
  if (pepitoCase.technicalComplete !== false || pepitoCase.sendAuthorized !== false) {
    violations.push("pepito_reference_must_hard_block_send");
  }

  const noRateLimitCase = evaluateCampaignsLegalTechnicalReadiness({
    sourceTraceImplemented: true,
    consentFieldsImplemented: true,
    unsubscribeImplemented: true,
    suppressionListImplemented: true,
    auditLogImplemented: true,
    sendRateLimitPerHourMax: 0,
    sesConfiguredOverride: true,
    pepitoDbReferenced: false,
    ceoLegalSendAuthorized: true,
  });
  if (noRateLimitCase.technicalComplete !== false) {
    violations.push("missing_rate_limit_must_block_technical_complete");
  }

  const savedBypass = process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS;
  delete process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS;
  const blockReasonWithoutBypass = getCampaignLaunchBlockReason({
    sourceTraceImplemented: true,
    consentFieldsImplemented: true,
    unsubscribeImplemented: true,
    suppressionListImplemented: true,
    auditLogImplemented: true,
    sendRateLimitPerHourMax: 500,
    sesConfiguredOverride: true,
    pepitoDbReferenced: false,
    ceoLegalSendAuthorized: true,
  });
  if (savedBypass !== undefined) process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS = savedBypass;
  else delete process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS;
  if (blockReasonWithoutBypass === null) {
    violations.push("launch_block_reason_must_be_non_null_without_bypass");
  }

  const withoutReinforcementInputs = evaluateCampaignsLegalTechnicalReadiness({
    sourceTraceImplemented: true,
    consentFieldsImplemented: true,
    unsubscribeImplemented: true,
    suppressionListImplemented: true,
    auditLogImplemented: true,
    sendRateLimitPerHourMax: 500,
    sesConfiguredOverride: true,
    pepitoDbReferenced: false,
    ceoLegalSendAuthorized: true,
  });
  if (withoutReinforcementInputs.checks.unsubscribeProofOk !== null) {
    violations.push("unsubscribe_proof_must_default_to_null_when_not_provided");
  }
  if (withoutReinforcementInputs.checks.templateAuditOk !== null) {
    violations.push("template_audit_must_default_to_null_when_not_provided");
  }
  if (withoutReinforcementInputs.checks.warming !== null) {
    violations.push("warming_must_default_to_null_when_not_provided");
  }
  if (withoutReinforcementInputs.checks.reputationScoreSynthetic.source !== "synthetic_placeholder") {
    violations.push("reputation_score_must_stay_synthetic_placeholder");
  }
  if (!withoutReinforcementInputs.technicalComplete || !withoutReinforcementInputs.sendAuthorized) {
    violations.push("reinforcement_fields_must_not_block_when_absent");
  }

  return { ok: violations.length === 0, violations };
}
