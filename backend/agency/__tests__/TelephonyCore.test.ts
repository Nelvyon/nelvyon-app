import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_RATE_LIMIT,
  DEFAULT_RECORDING_CONFIG,
  SimulatorTelephonyProvider,
  TelephonyProviderError,
  TwilioTelephonyProvider,
  assertTelephonyCoreIntegrity,
  assertTelephonyRealProviderDisabled,
  getSimulatorTelephonyProvider,
  isCallTranscriptionEnabled,
  resetSimulatorTelephonyProviderForTests,
} from "../TelephonyCore";

describe("TelephonyCore — simulator provider (ADR-056 block 11)", () => {
  let provider: SimulatorTelephonyProvider;

  beforeEach(() => {
    provider = new SimulatorTelephonyProvider();
  });

  it("defaults: recording OFF, sane rate limits, transcription OFF", () => {
    expect(DEFAULT_RECORDING_CONFIG.enabled).toBe(false);
    expect(DEFAULT_RATE_LIMIT.maxCallsPerMinute).toBeGreaterThan(0);
    expect(DEFAULT_RATE_LIMIT.maxCallsPerHour).toBeGreaterThan(0);
    expect(isCallTranscriptionEnabled()).toBe(false);
  });

  it("creates campaigns always in draft status", () => {
    const campaign = provider.createCampaign({ tenantId: "tenant-a", name: "Q3 leads" });
    expect(campaign.status).toBe("draft");
    expect(campaign.recordingConfig).toEqual(DEFAULT_RECORDING_CONFIG);
    expect(campaign.rateLimit).toEqual(DEFAULT_RATE_LIMIT);
  });

  it("enqueues a call end-to-end: queued -> in_progress -> completed", () => {
    const campaign = provider.createCampaign({ tenantId: "tenant-a", name: "campaign-1" });
    const item = provider.enqueueCall({
      tenantId: "tenant-a",
      campaignId: campaign.id,
      phoneE164: "+34600000001",
    });
    expect(item.status).toBe("queued");

    const started = provider.startCall({ tenantId: "tenant-a", queueItemId: item.id });
    expect(started.status).toBe("in_progress");
    expect(started.attempt).toBe(1);

    const ended = provider.endCall({ tenantId: "tenant-a", queueItemId: item.id, outcome: "completed" });
    expect(ended.status).toBe("completed");

    const timeline = provider.listCrmTimeline("tenant-a");
    expect(timeline.map((e) => e.type)).toEqual(["call_queued", "call_started", "call_ended"]);

    const audit = provider.listAuditLog("tenant-a");
    expect(audit.length).toBeGreaterThanOrEqual(4);
  });

  it("blocks enqueue for opted-out contacts (opt-out check)", () => {
    const campaign = provider.createCampaign({ tenantId: "tenant-a", name: "campaign-1" });
    provider.recordConsent({
      tenantId: "tenant-a",
      phoneE164: "+34600000002",
      status: "opted_out",
      source: "test",
    });
    const check = provider.optOutCheck({ tenantId: "tenant-a", phoneE164: "+34600000002" });
    expect(check.allowed).toBe(false);

    const item = provider.enqueueCall({
      tenantId: "tenant-a",
      campaignId: campaign.id,
      phoneE164: "+34600000002",
    });
    expect(item.status).toBe("blocked_opt_out");
    expect(provider.listCrmTimeline("tenant-a").some((e) => e.type === "call_blocked")).toBe(true);
  });

  it("allows contacts with unknown or opted-in consent", () => {
    expect(provider.optOutCheck({ tenantId: "tenant-a", phoneE164: "+34600000003" }).allowed).toBe(true);
    provider.recordConsent({
      tenantId: "tenant-a",
      phoneE164: "+34600000004",
      status: "opted_in",
      source: "test",
    });
    expect(provider.optOutCheck({ tenantId: "tenant-a", phoneE164: "+34600000004" }).allowed).toBe(true);
  });

  it("enforces per-minute rate limit metadata", () => {
    const campaign = provider.createCampaign({
      tenantId: "tenant-a",
      name: "tight-limit",
      rateLimit: { maxCallsPerMinute: 1, maxCallsPerHour: 100 },
    });
    const first = provider.enqueueCall({ tenantId: "tenant-a", campaignId: campaign.id, phoneE164: "+1" });
    provider.startCall({ tenantId: "tenant-a", queueItemId: first.id });

    const second = provider.enqueueCall({ tenantId: "tenant-a", campaignId: campaign.id, phoneE164: "+2" });
    expect(second.status).toBe("blocked_rate_limit");
  });

  it("tenant isolation: tenant A cannot see or touch tenant B's data", () => {
    const campaignA = provider.createCampaign({ tenantId: "tenant-a", name: "a" });
    const campaignB = provider.createCampaign({ tenantId: "tenant-b", name: "b" });
    const itemA = provider.enqueueCall({ tenantId: "tenant-a", campaignId: campaignA.id, phoneE164: "+1" });
    provider.enqueueCall({ tenantId: "tenant-b", campaignId: campaignB.id, phoneE164: "+2" });

    expect(provider.listQueue("tenant-a").length).toBe(1);
    expect(provider.listQueue("tenant-b").length).toBe(1);
    expect(provider.listAuditLog("tenant-a").length).toBeGreaterThan(0);
    expect(provider.listAuditLog("tenant-b").length).toBeGreaterThan(0);

    expect(() => provider.startCall({ tenantId: "tenant-b", queueItemId: itemA.id })).toThrow(
      TelephonyProviderError,
    );
    try {
      provider.startCall({ tenantId: "tenant-b", queueItemId: itemA.id });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TelephonyProviderError);
      expect((err as TelephonyProviderError).code).toBe("NOT_FOUND");
    }
  });

  it("recording metadata: available only when campaign recording is enabled and call completed", () => {
    const campaignOff = provider.createCampaign({ tenantId: "tenant-a", name: "no-record" });
    const item = provider.enqueueCall({ tenantId: "tenant-a", campaignId: campaignOff.id, phoneE164: "+1" });
    provider.startCall({ tenantId: "tenant-a", queueItemId: item.id });
    provider.endCall({ tenantId: "tenant-a", queueItemId: item.id, outcome: "completed" });
    const meta = provider.getRecordingMeta({ tenantId: "tenant-a", queueItemId: item.id });
    expect(meta.available).toBe(false);
    expect(meta.transcriptionStatus).toBe("prepared_off");

    const campaignOn = provider.createCampaign({
      tenantId: "tenant-a",
      name: "with-record",
      recordingConfig: { enabled: true },
    });
    const item2 = provider.enqueueCall({ tenantId: "tenant-a", campaignId: campaignOn.id, phoneE164: "+2" });
    provider.startCall({ tenantId: "tenant-a", queueItemId: item2.id });
    provider.endCall({ tenantId: "tenant-a", queueItemId: item2.id, outcome: "completed" });
    const meta2 = provider.getRecordingMeta({ tenantId: "tenant-a", queueItemId: item2.id });
    expect(meta2.available).toBe(true);
    expect(meta2.transcriptionStatus).toBe("prepared_off");
  });

  it("rejects invalid state transitions", () => {
    const campaign = provider.createCampaign({ tenantId: "tenant-a", name: "c" });
    const item = provider.enqueueCall({ tenantId: "tenant-a", campaignId: campaign.id, phoneE164: "+1" });
    expect(() => provider.endCall({ tenantId: "tenant-a", queueItemId: item.id, outcome: "completed" })).toThrow(
      /cannot end call/,
    );
    provider.startCall({ tenantId: "tenant-a", queueItemId: item.id });
    expect(() => provider.startCall({ tenantId: "tenant-a", queueItemId: item.id })).toThrow(/cannot start call/);
  });

  it("requires a tenantId", () => {
    expect(() => provider.createCampaign({ tenantId: "", name: "x" })).toThrow(TelephonyProviderError);
  });
});

describe("TelephonyCore — real provider permanently blocked", () => {
  it("TwilioTelephonyProvider always throws BLOCKED_EXTERNAL on construction", () => {
    try {
      // eslint-disable-next-line no-new
      new TwilioTelephonyProvider();
      throw new Error("expected constructor to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TelephonyProviderError);
      expect((err as TelephonyProviderError).code).toBe("BLOCKED_EXTERNAL");
    }
  });

  it("assertTelephonyRealProviderDisabled always reports ok:true", () => {
    const result = assertTelephonyRealProviderDisabled();
    expect(result.ok).toBe(true);
    expect(result.blocked).toBe(true);
  });

  it("passes full integrity assertion", () => {
    expect(assertTelephonyCoreIntegrity()).toEqual({ ok: true, violations: [] });
  });
});

describe("TelephonyCore — shared singleton helper", () => {
  afterEach(() => {
    resetSimulatorTelephonyProviderForTests();
  });

  it("returns the same instance and can be reset for tests", () => {
    const a = getSimulatorTelephonyProvider();
    const campaign = a.createCampaign({ tenantId: "tenant-a", name: "singleton" });
    const b = getSimulatorTelephonyProvider();
    expect(b.getCampaign("tenant-a", campaign.id)?.id).toBe(campaign.id);

    resetSimulatorTelephonyProviderForTests();
    const c = getSimulatorTelephonyProvider();
    expect(c.getCampaign("tenant-a", campaign.id)).toBeNull();
  });
});
