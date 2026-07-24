import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_WARMING_PLAN,
  addToSuppressionList,
  assertMassSendTechnicalControlsIntegrity,
  auditEmailTemplate,
  buildWarmingMetadata,
  checkRateLimit,
  checkUnsubscribeProof,
  currentHourSendCount,
  filterSuppressedRecipients,
  getSyntheticReputationScoreStub,
  getWarmingStageForDay,
  isSuppressed,
  listSuppressionEntries,
  recordSendForRateLimit,
  resetRateLimitWindowForTests,
  resetSuppressionListForTests,
} from "../MassSendTechnicalControls";

describe("MassSendTechnicalControls", () => {
  beforeEach(() => {
    resetSuppressionListForTests();
    resetRateLimitWindowForTests();
  });

  it("suppression list — add/check/filter, case-insensitive", () => {
    addToSuppressionList("Bounced@Nelvyon.test", "bounce");
    expect(isSuppressed("bounced@nelvyon.test")).toBe(true);
    expect(isSuppressed("ok@nelvyon.test")).toBe(false);
    const { allowed, suppressed } = filterSuppressedRecipients(["bounced@nelvyon.test", "ok@nelvyon.test"]);
    expect(suppressed).toEqual(["bounced@nelvyon.test"]);
    expect(allowed).toEqual(["ok@nelvyon.test"]);
    expect(listSuppressionEntries()).toHaveLength(1);
  });

  it("checkUnsubscribeProof — fails when any RFC requirement is missing", () => {
    expect(
      checkUnsubscribeProof({ hasOneClickLink: true, hasListUnsubscribeHeader: true, hasListUnsubscribePostHeader: false })
        .ok,
    ).toBe(false);
    expect(
      checkUnsubscribeProof({ hasOneClickLink: true, hasListUnsubscribeHeader: true, hasListUnsubscribePostHeader: true })
        .ok,
    ).toBe(true);
  });

  it("rate limit — sliding window enforces maxPerHour", () => {
    for (let i = 0; i < 3; i += 1) recordSendForRateLimit();
    expect(currentHourSendCount()).toBe(3);
    expect(checkRateLimit(5).ok).toBe(true);
    expect(checkRateLimit(3).ok).toBe(false);
    expect(checkRateLimit(3).remaining).toBe(0);
  });

  it("rate limit — invalid maxPerHour is never ok", () => {
    expect(checkRateLimit(0).ok).toBe(false);
    expect(checkRateLimit(Number.NaN).ok).toBe(false);
    expect(checkRateLimit(-5).ok).toBe(false);
  });

  it("warming plan is conservative and monotonic increasing", () => {
    expect(DEFAULT_WARMING_PLAN.length).toBeGreaterThan(0);
    const sorted = [...DEFAULT_WARMING_PLAN].sort((a, b) => a.day - b.day);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i]!.maxSendsPerDay).toBeGreaterThanOrEqual(sorted[i - 1]!.maxSendsPerDay);
    }
    expect(getWarmingStageForDay(1).maxSendsPerDay).toBeLessThanOrEqual(100);
    expect(getWarmingStageForDay(9999).maxSendsPerDay).toBe(sorted[sorted.length - 1]!.maxSendsPerDay);
  });

  it("buildWarmingMetadata computes day number from startedAt", () => {
    const startedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const meta = buildWarmingMetadata(startedAt);
    expect(meta.dayNumber).toBeGreaterThanOrEqual(3);
    expect(meta.stage.maxSendsPerDay).toBeGreaterThan(0);
  });

  it("reputation score stub is always synthetic — never a real ISP integration", () => {
    const rep = getSyntheticReputationScoreStub();
    expect(rep.source).toBe("synthetic_placeholder");
    expect(rep.score).toBeGreaterThanOrEqual(0);
  });

  it("auditEmailTemplate flags spam phrases + missing unsubscribe/address, passes clean templates", () => {
    const bad = auditEmailTemplate({
      html: "<p>100% GRATIS — actúa ahora!</p>",
      hasUnsubscribeLink: false,
      hasPhysicalAddress: false,
    });
    expect(bad.ok).toBe(false);
    expect(bad.issues).toContain("missing_unsubscribe_link");
    expect(bad.issues).toContain("missing_physical_address_can_spam");
    expect(bad.issues.some((i) => i.startsWith("spam_trigger_phrase:"))).toBe(true);

    const good = auditEmailTemplate({
      html: "<p>Gracias por tu interés en nuestro servicio.</p>",
      hasUnsubscribeLink: true,
      hasPhysicalAddress: true,
    });
    expect(good.ok).toBe(true);
    expect(good.issues).toEqual([]);
  });

  it("passes its own integrity assertion", () => {
    expect(assertMassSendTechnicalControlsIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
