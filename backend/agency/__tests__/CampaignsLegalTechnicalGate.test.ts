import { describe, expect, it } from "vitest";
import {
  assertCampaignsLegalTechnicalGateIntegrity,
  evaluateCampaignsLegalTechnicalReadiness,
} from "../CampaignsLegalTechnicalGate";

describe("Campaigns legal + technical readiness gate (claimReadyLegal always false)", () => {
  it("claimReadyLegal is always false, even in the best-case technical scenario", () => {
    const result = evaluateCampaignsLegalTechnicalReadiness({
      sourceTraceImplemented: true,
      consentFieldsImplemented: true,
      unsubscribeImplemented: true,
      sesConfiguredOverride: true,
      pepitoDbReferenced: false,
      ceoLegalSendAuthorized: true,
    });
    expect(result.claimReadyLegal).toBe(false);
    expect(result.technicalComplete).toBe(true);
    expect(result.pepitoDbForbidden).toBe(true);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "legal_written_commercial_license_pending",
        "legal_review_confirmation_pending",
      ]),
    );
  });

  it("Pepito DB reference is always forbidden and blocks technicalComplete", () => {
    const result = evaluateCampaignsLegalTechnicalReadiness({
      sourceTraceImplemented: true,
      consentFieldsImplemented: true,
      unsubscribeImplemented: true,
      sesConfiguredOverride: true,
      pepitoDbReferenced: true,
      ceoLegalSendAuthorized: true,
    });
    expect(result.technicalComplete).toBe(false);
    expect(result.pepitoDbForbidden).toBe(true);
    expect(result.blockers).toContain("pepito_db_forbidden_reference_detected");
    expect(result.claimReadyLegal).toBe(false);
  });

  it("blocks technicalComplete when source_trace, consent, unsubscribe, or SES are missing", () => {
    const result = evaluateCampaignsLegalTechnicalReadiness({
      sourceTraceImplemented: false,
      consentFieldsImplemented: false,
      unsubscribeImplemented: false,
      sesConfiguredOverride: false,
    });
    expect(result.technicalComplete).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "source_trace_missing",
        "consent_fields_missing",
        "unsubscribe_missing",
        "ses_not_configured",
      ]),
    );
    expect(result.claimReadyLegal).toBe(false);
  });

  it("never sends without explicit CEO + legal authorization, even with technicalComplete true", () => {
    const result = evaluateCampaignsLegalTechnicalReadiness({
      sourceTraceImplemented: true,
      consentFieldsImplemented: true,
      unsubscribeImplemented: true,
      sesConfiguredOverride: true,
      ceoLegalSendAuthorized: false,
    });
    expect(result.technicalComplete).toBe(true);
    expect(result.blockers).toContain("no_send_without_ceo_and_legal");
    expect(result.claimReadyLegal).toBe(false);
  });

  it("passes its own integrity assertion", () => {
    expect(assertCampaignsLegalTechnicalGateIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
