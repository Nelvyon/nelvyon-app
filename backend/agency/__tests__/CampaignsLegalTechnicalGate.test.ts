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
