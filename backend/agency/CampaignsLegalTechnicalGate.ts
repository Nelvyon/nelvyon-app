/**
 * Campaigns legal + technical readiness gate (ADR-053 extension).
 * Technical readiness (source_trace, consent, unsubscribe, SES presence) is code-verifiable.
 * Legal readiness is NOT: `claimReadyLegal` is hardcoded `false` and can only ever change via a
 * manual code update after a real written commercial license + legal review confirmation exist —
 * never via a runtime flag, input parameter, or environment variable.
 *
 * See `docs/ops/CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md` for the full checklist and rationale.
 */

import { isSesEnvConfigured } from "../saas/saasEnv";

export type CampaignsLegalTechnicalInput = {
  /** Every outbound message links back to its consent/source record. */
  sourceTraceImplemented: boolean;
  /** Opt-in/consent fields exist and are enforced before send. */
  consentFieldsImplemented: boolean;
  /** One-click unsubscribe + List-Unsubscribe header implemented. */
  unsubscribeImplemented: boolean;
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
  blockers: string[];
  /** Always true — the Pepito demo/scraped DB is permanently forbidden as a campaign source. */
  pepitoDbForbidden: true;
  checks: {
    sourceTraceImplemented: boolean;
    consentFieldsImplemented: boolean;
    unsubscribeImplemented: boolean;
    sesConfigured: boolean;
    pepitoDbClean: boolean;
    ceoLegalSendAuthorized: boolean;
  };
};

const LEGAL_BLOCKERS = [
  "legal_written_commercial_license_pending",
  "legal_review_confirmation_pending",
] as const;

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

  const blockers: string[] = [];
  if (!input.sourceTraceImplemented) blockers.push("source_trace_missing");
  if (!input.consentFieldsImplemented) blockers.push("consent_fields_missing");
  if (!input.unsubscribeImplemented) blockers.push("unsubscribe_missing");
  if (!sesConfigured) blockers.push("ses_not_configured");
  if (!pepitoDbClean) blockers.push("pepito_db_forbidden_reference_detected");
  if (!ceoLegalSendAuthorized) blockers.push("no_send_without_ceo_and_legal");
  blockers.push(...LEGAL_BLOCKERS);

  const technicalComplete =
    input.sourceTraceImplemented &&
    input.consentFieldsImplemented &&
    input.unsubscribeImplemented &&
    sesConfigured &&
    pepitoDbClean;

  return {
    technicalComplete,
    claimReadyLegal: false,
    blockers: [...new Set(blockers)],
    pepitoDbForbidden: true,
    checks: {
      sourceTraceImplemented: input.sourceTraceImplemented,
      consentFieldsImplemented: input.consentFieldsImplemented,
      unsubscribeImplemented: input.unsubscribeImplemented,
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
    sesConfiguredOverride: true,
    pepitoDbReferenced: false,
    ceoLegalSendAuthorized: true,
  });
  if ((bestCase.claimReadyLegal as unknown) !== false) {
    violations.push("claim_ready_legal_must_always_be_false");
  }
  if (bestCase.pepitoDbForbidden !== true) violations.push("pepito_db_must_always_be_forbidden");
  if (!bestCase.blockers.includes("legal_written_commercial_license_pending")) {
    violations.push("must_keep_legal_license_blocker");
  }
  if (!bestCase.blockers.includes("legal_review_confirmation_pending")) {
    violations.push("must_keep_legal_review_blocker");
  }
  return { ok: violations.length === 0, violations };
}
