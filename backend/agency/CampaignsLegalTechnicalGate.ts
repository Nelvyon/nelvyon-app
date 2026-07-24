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
    },
  };
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

  return { ok: violations.length === 0, violations };
}
