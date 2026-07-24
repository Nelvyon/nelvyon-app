import { afterEach, describe, expect, it } from "vitest";
import {
  assertCampaignsLegalTechnicalGateIntegrity,
  evaluateCampaignsLegalTechnicalReadiness,
  getCampaignLaunchBlockReason,
  type CampaignsLegalTechnicalInput,
} from "../CampaignsLegalTechnicalGate";

function fullTechnicalInput(
  overrides: Partial<CampaignsLegalTechnicalInput> = {},
): CampaignsLegalTechnicalInput {
  return {
    sourceTraceImplemented: true,
    consentFieldsImplemented: true,
    unsubscribeImplemented: true,
    suppressionListImplemented: true,
    auditLogImplemented: true,
    sendRateLimitPerHourMax: 500,
    sesConfiguredOverride: true,
    pepitoDbReferenced: false,
    ceoLegalSendAuthorized: true,
    ...overrides,
  };
}

describe("Campaigns legal + technical readiness gate (claimReadyLegal always false)", () => {
  it("claimReadyLegal is always false, even in the best-case technical scenario", () => {
    const result = evaluateCampaignsLegalTechnicalReadiness(fullTechnicalInput());
    expect(result.claimReadyLegal).toBe(false);
    expect(result.technicalComplete).toBe(true);
    expect(result.sendAuthorized).toBe(true);
    expect(result.pepitoDbForbidden).toBe(true);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "legal_written_commercial_license_pending",
        "legal_review_confirmation_pending",
      ]),
    );
  });

  it("Pepito DB reference is always forbidden and blocks technicalComplete + sendAuthorized", () => {
    const result = evaluateCampaignsLegalTechnicalReadiness(
      fullTechnicalInput({ pepitoDbReferenced: true }),
    );
    expect(result.technicalComplete).toBe(false);
    expect(result.sendAuthorized).toBe(false);
    expect(result.pepitoDbForbidden).toBe(true);
    expect(result.blockers).toContain("pepito_db_forbidden_reference_detected");
    expect(result.claimReadyLegal).toBe(false);
  });

  it("blocks technicalComplete when source_trace, consent, unsubscribe, or SES are missing", () => {
    const result = evaluateCampaignsLegalTechnicalReadiness({
      sourceTraceImplemented: false,
      consentFieldsImplemented: false,
      unsubscribeImplemented: false,
      suppressionListImplemented: false,
      auditLogImplemented: false,
      sendRateLimitPerHourMax: 0,
      sesConfiguredOverride: false,
    });
    expect(result.technicalComplete).toBe(false);
    expect(result.sendAuthorized).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "source_trace_missing",
        "consent_fields_missing",
        "unsubscribe_missing",
        "suppression_list_missing",
        "audit_log_missing",
        "send_rate_limit_missing_or_invalid",
        "ses_not_configured",
      ]),
    );
    expect(result.claimReadyLegal).toBe(false);
  });

  it("requires a positive, sane send rate limit — zero, negative, NaN, or absurdly high all block", () => {
    for (const badRate of [0, -1, Number.NaN, 1_000_000]) {
      const result = evaluateCampaignsLegalTechnicalReadiness(
        fullTechnicalInput({ sendRateLimitPerHourMax: badRate }),
      );
      expect(result.checks.rateLimitDeclared).toBe(false);
      expect(result.checks.sendRateLimitPerHourMax).toBeNull();
      expect(result.technicalComplete).toBe(false);
      expect(result.blockers).toContain("send_rate_limit_missing_or_invalid");
    }
  });

  it("requires suppression list + audit log implemented for technicalComplete", () => {
    const noSuppression = evaluateCampaignsLegalTechnicalReadiness(
      fullTechnicalInput({ suppressionListImplemented: false }),
    );
    expect(noSuppression.technicalComplete).toBe(false);
    expect(noSuppression.blockers).toContain("suppression_list_missing");

    const noAudit = evaluateCampaignsLegalTechnicalReadiness(
      fullTechnicalInput({ auditLogImplemented: false }),
    );
    expect(noAudit.technicalComplete).toBe(false);
    expect(noAudit.blockers).toContain("audit_log_missing");
  });

  it("never sends without explicit CEO + legal authorization, even with technicalComplete true", () => {
    const result = evaluateCampaignsLegalTechnicalReadiness(
      fullTechnicalInput({ ceoLegalSendAuthorized: false }),
    );
    expect(result.technicalComplete).toBe(true);
    expect(result.sendAuthorized).toBe(false);
    expect(result.blockers).toContain("no_send_without_ceo_and_legal");
    expect(result.claimReadyLegal).toBe(false);
  });

  it("passes its own integrity assertion", () => {
    expect(assertCampaignsLegalTechnicalGateIntegrity()).toEqual({ ok: true, violations: [] });
  });
});

describe("CampaignsLegalTechnicalGate — technical reinforcement fields (ADR-055 extension)", () => {
  it("reinforcement checks default to null/synthetic when not provided and never gate the send", () => {
    const result = evaluateCampaignsLegalTechnicalReadiness(fullTechnicalInput());
    expect(result.checks.unsubscribeProofOk).toBeNull();
    expect(result.checks.templateAuditOk).toBeNull();
    expect(result.checks.templateAuditIssues).toEqual([]);
    expect(result.checks.warming).toBeNull();
    expect(result.checks.reputationScoreSynthetic.source).toBe("synthetic_placeholder");
    expect(result.technicalComplete).toBe(true);
    expect(result.sendAuthorized).toBe(true);
  });

  it("surfaces unsubscribe proof and template audit results without affecting technicalComplete", () => {
    const badResult = evaluateCampaignsLegalTechnicalReadiness(
      fullTechnicalInput({
        unsubscribeProof: { hasOneClickLink: false, hasListUnsubscribeHeader: false, hasListUnsubscribePostHeader: false },
        templateAudit: { html: "100% GRATIS actúa ahora", hasUnsubscribeLink: false, hasPhysicalAddress: false },
      }),
    );
    expect(badResult.checks.unsubscribeProofOk).toBe(false);
    expect(badResult.checks.templateAuditOk).toBe(false);
    expect(badResult.checks.templateAuditIssues.length).toBeGreaterThan(0);
    // Informational only — the hard technical/legal gate is unaffected.
    expect(badResult.technicalComplete).toBe(true);
    expect(badResult.claimReadyLegal).toBe(false);

    const goodResult = evaluateCampaignsLegalTechnicalReadiness(
      fullTechnicalInput({
        unsubscribeProof: { hasOneClickLink: true, hasListUnsubscribeHeader: true, hasListUnsubscribePostHeader: true },
        templateAudit: {
          html: "Gracias por tu interés",
          hasUnsubscribeLink: true,
          hasPhysicalAddress: true,
        },
      }),
    );
    expect(goodResult.checks.unsubscribeProofOk).toBe(true);
    expect(goodResult.checks.templateAuditOk).toBe(true);
  });

  it("surfaces warming metadata when warmingStartedAt is provided", () => {
    const result = evaluateCampaignsLegalTechnicalReadiness(
      fullTechnicalInput({ warmingStartedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }),
    );
    expect(result.checks.warming).not.toBeNull();
    expect(result.checks.warming?.dayNumber).toBeGreaterThanOrEqual(1);
    expect(result.checks.warming?.stage.maxSendsPerDay).toBeGreaterThan(0);
  });
});

describe("getCampaignLaunchBlockReason", () => {
  const savedBypass = process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS;

  afterEach(() => {
    if (savedBypass !== undefined) process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS = savedBypass;
    else delete process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS;
  });

  it("without bypass, returns a non-null string mentioning claimReadyLegal=false, even in the best-case input", () => {
    delete process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS;
    const reason = getCampaignLaunchBlockReason(fullTechnicalInput());
    expect(typeof reason).toBe("string");
    expect(reason).toContain("claimReadyLegal=false");
  });

  it("without bypass and with no input at all, still blocks with honest/conservative defaults", () => {
    delete process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS;
    const reason = getCampaignLaunchBlockReason();
    expect(typeof reason).toBe("string");
    expect(reason).toContain("claimReadyLegal=false");
  });

  it("without bypass, pepitoDbReferenced=true is mentioned as a hard block", () => {
    delete process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS;
    const reason = getCampaignLaunchBlockReason(fullTechnicalInput({ pepitoDbReferenced: true }));
    expect(reason).toContain("pepitoDbClean=false");
  });

  it("with bypass active (NODE_ENV=test/VITEST=true), returns null", () => {
    process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS = "1";
    expect(getCampaignLaunchBlockReason(fullTechnicalInput())).toBeNull();
  });
});
