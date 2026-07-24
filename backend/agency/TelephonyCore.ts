/**
 * Dialer telephony CORE — simulator only (ADR-056 block 11).
 *
 * This module defines the canonical telephony domain model (consent, call queue,
 * campaigns, recordings, audit) and ships exactly ONE working provider:
 * `SimulatorTelephonyProvider` — fully in-memory, synthetic-only, and it NEVER
 * performs any network call. It exists so the dialer service surface (queueing,
 * consent/opt-out enforcement, rate limiting, CRM timeline, recording metadata)
 * can be built, tested, and certified without depending on a real telephony vendor.
 *
 * `TwilioTelephonyProvider` is a stub whose constructor ALWAYS throws
 * `BLOCKED_EXTERNAL` — it can never be instantiated, so it can never place a real
 * call, regardless of environment variables or input. There is no environment
 * flag that flips this: going live with a real provider requires a manual code
 * change after `docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md` is completed and a
 * real, reviewed implementation replaces the stub — never a runtime toggle.
 *
 * `assertTelephonyRealProviderDisabled()` is the integrity check: it proves the
 * real provider path is unusable by attempting to construct it and asserting the
 * construction always fails with `BLOCKED_EXTERNAL`.
 *
 * This module does NOT call `backend/integrations/TwilioService.ts` or any other
 * existing Twilio integration — it is fully independent so nothing here can
 * accidentally wire into a live dial path.
 */

import { randomUUID } from "node:crypto";

export type TenantId = string;

export type TelephonyProviderErrorCode =
  | "NOT_AUTHORIZED"
  | "BLOCKED_EXTERNAL"
  | "TENANT_MISMATCH"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "OPTED_OUT"
  | "INVALID_STATE";

export class TelephonyProviderError extends Error {
  readonly code: TelephonyProviderErrorCode;

  constructor(code: TelephonyProviderErrorCode, message: string) {
    super(message);
    this.name = "TelephonyProviderError";
    this.code = code;
  }
}

export type ContactConsentStatus = "unknown" | "opted_in" | "opted_out";

export type ContactConsent = {
  tenantId: TenantId;
  phoneE164: string;
  status: ContactConsentStatus;
  source: string;
  recordedAt: string;
};

export type RecordingConfig = {
  /** Recording is OFF by default — must be explicitly enabled per campaign. */
  enabled: boolean;
  retentionDays: number;
};

export const DEFAULT_RECORDING_CONFIG: RecordingConfig = { enabled: false, retentionDays: 0 };

export type RateLimitMeta = {
  maxCallsPerMinute: number;
  maxCallsPerHour: number;
};

export const DEFAULT_RATE_LIMIT: RateLimitMeta = { maxCallsPerMinute: 10, maxCallsPerHour: 200 };

/** Campaigns are always created in `draft` — this core has no "launch to live" path. */
export type CallCampaign = {
  id: string;
  tenantId: TenantId;
  name: string;
  status: "draft";
  createdAt: string;
  recordingConfig: RecordingConfig;
  rateLimit: RateLimitMeta;
};

export type CallQueueItemStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "blocked_opt_out"
  | "blocked_rate_limit";

export type CallQueueItem = {
  id: string;
  tenantId: TenantId;
  campaignId: string;
  phoneE164: string;
  status: CallQueueItemStatus;
  attempt: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
};

export type RecordingMeta = {
  callId: string;
  tenantId: TenantId;
  available: boolean;
  durationSec: number;
  transcriptionStatus: "prepared_off" | "disabled";
};

export type AuditEntry = {
  id: string;
  tenantId: TenantId;
  at: string;
  action: string;
  detail: string;
};

export type CrmTimelineEventType = "call_queued" | "call_started" | "call_ended" | "call_blocked";

export type CrmTimelineEvent = {
  id: string;
  tenantId: TenantId;
  contactPhoneE164: string;
  type: CrmTimelineEventType;
  at: string;
  detail: string;
};

/**
 * Local transcription is PREPARED_OFF: even the simulator never produces real
 * transcripts. This flag exists purely to document the future gate — its default
 * is `0`/unset, and this module never transcribes audio regardless of its value.
 */
export function isCallTranscriptionEnabled(): boolean {
  const v = process.env.NELVYON_CALL_TRANSCRIPTION_ENABLED?.trim();
  return v === "1" || v?.toLowerCase() === "true";
}

/**
 * Abstract telephony provider contract. Any real implementation (Twilio or
 * otherwise) must satisfy this shape, but only `SimulatorTelephonyProvider`
 * (synthetic, in-memory) is usable in this codebase today.
 */
export interface TelephonyProvider {
  readonly kind: "simulator" | "twilio";
  enqueueCall(input: { tenantId: TenantId; campaignId: string; phoneE164: string }): CallQueueItem;
  startCall(input: { tenantId: TenantId; queueItemId: string }): CallQueueItem;
  endCall(input: {
    tenantId: TenantId;
    queueItemId: string;
    outcome: "completed" | "failed";
  }): CallQueueItem;
  getRecordingMeta(input: { tenantId: TenantId; queueItemId: string }): RecordingMeta;
  optOutCheck(input: { tenantId: TenantId; phoneE164: string }): { allowed: boolean; reason: string };
}

type TenantState = {
  consents: Map<string, ContactConsent>;
  campaigns: Map<string, CallCampaign>;
  queue: Map<string, CallQueueItem>;
  auditLog: AuditEntry[];
  crmTimeline: CrmTimelineEvent[];
  callTimestampsMs: number[];
};

function emptyTenantState(): TenantState {
  return {
    consents: new Map(),
    campaigns: new Map(),
    queue: new Map(),
    auditLog: [],
    crmTimeline: [],
    callTimestampsMs: [],
  };
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * In-memory, synthetic-only telephony provider. Never performs I/O, never hits
 * a network socket, and enforces tenant isolation via a per-tenant state map —
 * tenant A can never read or mutate tenant B's consents, queue, or audit log.
 */
export class SimulatorTelephonyProvider implements TelephonyProvider {
  readonly kind = "simulator" as const;

  private readonly tenants = new Map<TenantId, TenantState>();

  private stateFor(tenantId: TenantId): TenantState {
    if (!tenantId) throw new TelephonyProviderError("TENANT_MISMATCH", "tenantId is required");
    let state = this.tenants.get(tenantId);
    if (!state) {
      state = emptyTenantState();
      this.tenants.set(tenantId, state);
    }
    return state;
  }

  private audit(tenantId: TenantId, action: string, detail: string): void {
    this.stateFor(tenantId).auditLog.push({
      id: randomUUID(),
      tenantId,
      at: new Date().toISOString(),
      action,
      detail,
    });
  }

  private timeline(
    tenantId: TenantId,
    contactPhoneE164: string,
    type: CrmTimelineEventType,
    detail: string,
  ): void {
    this.stateFor(tenantId).crmTimeline.push({
      id: randomUUID(),
      tenantId,
      contactPhoneE164,
      type,
      at: new Date().toISOString(),
      detail,
    });
  }

  reset(): void {
    this.tenants.clear();
  }

  createCampaign(input: {
    tenantId: TenantId;
    name: string;
    recordingConfig?: Partial<RecordingConfig>;
    rateLimit?: Partial<RateLimitMeta>;
  }): CallCampaign {
    const state = this.stateFor(input.tenantId);
    const campaign: CallCampaign = {
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      status: "draft",
      createdAt: new Date().toISOString(),
      recordingConfig: { ...DEFAULT_RECORDING_CONFIG, ...input.recordingConfig },
      rateLimit: { ...DEFAULT_RATE_LIMIT, ...input.rateLimit },
    };
    state.campaigns.set(campaign.id, campaign);
    this.audit(input.tenantId, "campaign_created", `campaign=${campaign.id} name=${campaign.name} status=draft`);
    return campaign;
  }

  getCampaign(tenantId: TenantId, campaignId: string): CallCampaign | null {
    return this.stateFor(tenantId).campaigns.get(campaignId) ?? null;
  }

  listCampaigns(tenantId: TenantId): CallCampaign[] {
    return [...this.stateFor(tenantId).campaigns.values()];
  }

  recordConsent(input: {
    tenantId: TenantId;
    phoneE164: string;
    status: ContactConsentStatus;
    source: string;
  }): ContactConsent {
    const state = this.stateFor(input.tenantId);
    const consent: ContactConsent = {
      tenantId: input.tenantId,
      phoneE164: input.phoneE164,
      status: input.status,
      source: input.source,
      recordedAt: new Date().toISOString(),
    };
    state.consents.set(input.phoneE164, consent);
    this.audit(input.tenantId, "consent_recorded", `phone=${input.phoneE164} status=${input.status}`);
    return consent;
  }

  getConsent(tenantId: TenantId, phoneE164: string): ContactConsent | null {
    return this.stateFor(tenantId).consents.get(phoneE164) ?? null;
  }

  /** Only `opted_out` blocks; `unknown`/`opted_in` are allowed (conservative default). */
  optOutCheck(input: { tenantId: TenantId; phoneE164: string }): { allowed: boolean; reason: string } {
    const consent = this.getConsent(input.tenantId, input.phoneE164);
    if (consent?.status === "opted_out") {
      return { allowed: false, reason: "contact_opted_out" };
    }
    return { allowed: true, reason: consent?.status === "opted_in" ? "explicit_opt_in" : "no_opt_out_on_record" };
  }

  private withinRateLimit(tenantId: TenantId, campaign: CallCampaign): boolean {
    const state = this.stateFor(tenantId);
    const now = Date.now();
    state.callTimestampsMs = state.callTimestampsMs.filter((t) => now - t < HOUR_MS);
    const lastMinute = state.callTimestampsMs.filter((t) => now - t < MINUTE_MS).length;
    const lastHour = state.callTimestampsMs.length;
    return lastMinute < campaign.rateLimit.maxCallsPerMinute && lastHour < campaign.rateLimit.maxCallsPerHour;
  }

  enqueueCall(input: { tenantId: TenantId; campaignId: string; phoneE164: string }): CallQueueItem {
    const state = this.stateFor(input.tenantId);
    const campaign = state.campaigns.get(input.campaignId);
    if (!campaign) throw new TelephonyProviderError("NOT_FOUND", `campaign not found: ${input.campaignId}`);

    const optOut = this.optOutCheck({ tenantId: input.tenantId, phoneE164: input.phoneE164 });
    const rateOk = this.withinRateLimit(input.tenantId, campaign);

    const status: CallQueueItemStatus = !optOut.allowed
      ? "blocked_opt_out"
      : !rateOk
        ? "blocked_rate_limit"
        : "queued";

    const item: CallQueueItem = {
      id: randomUUID(),
      tenantId: input.tenantId,
      campaignId: input.campaignId,
      phoneE164: input.phoneE164,
      status,
      attempt: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null,
    };
    state.queue.set(item.id, item);

    if (status === "queued") {
      this.audit(input.tenantId, "call_enqueued", `queue_item=${item.id} phone=${item.phoneE164}`);
      this.timeline(input.tenantId, item.phoneE164, "call_queued", `campaign=${input.campaignId}`);
    } else {
      this.audit(input.tenantId, "call_blocked", `queue_item=${item.id} reason=${status}`);
      this.timeline(input.tenantId, item.phoneE164, "call_blocked", `reason=${status}`);
    }
    return item;
  }

  private getOwnedQueueItem(tenantId: TenantId, queueItemId: string): CallQueueItem {
    const state = this.stateFor(tenantId);
    const item = state.queue.get(queueItemId);
    if (!item) throw new TelephonyProviderError("NOT_FOUND", `queue item not found: ${queueItemId}`);
    if (item.tenantId !== tenantId) {
      throw new TelephonyProviderError("TENANT_MISMATCH", "cross-tenant access to queue item denied");
    }
    return item;
  }

  startCall(input: { tenantId: TenantId; queueItemId: string }): CallQueueItem {
    const item = this.getOwnedQueueItem(input.tenantId, input.queueItemId);
    if (item.status !== "queued") {
      throw new TelephonyProviderError("INVALID_STATE", `cannot start call from status=${item.status}`);
    }
    item.status = "in_progress";
    item.attempt += 1;
    item.startedAt = new Date().toISOString();
    this.stateFor(input.tenantId).callTimestampsMs.push(Date.now());
    this.audit(input.tenantId, "call_started", `queue_item=${item.id}`);
    this.timeline(input.tenantId, item.phoneE164, "call_started", `attempt=${item.attempt}`);
    return item;
  }

  endCall(input: {
    tenantId: TenantId;
    queueItemId: string;
    outcome: "completed" | "failed";
  }): CallQueueItem {
    const item = this.getOwnedQueueItem(input.tenantId, input.queueItemId);
    if (item.status !== "in_progress") {
      throw new TelephonyProviderError("INVALID_STATE", `cannot end call from status=${item.status}`);
    }
    item.status = input.outcome;
    item.endedAt = new Date().toISOString();
    this.audit(input.tenantId, "call_ended", `queue_item=${item.id} outcome=${input.outcome}`);
    this.timeline(input.tenantId, item.phoneE164, "call_ended", `outcome=${input.outcome}`);
    return item;
  }

  getRecordingMeta(input: { tenantId: TenantId; queueItemId: string }): RecordingMeta {
    const item = this.getOwnedQueueItem(input.tenantId, input.queueItemId);
    const campaign = item.campaignId
      ? this.stateFor(input.tenantId).campaigns.get(item.campaignId)
      : undefined;
    const recordingEnabled = campaign?.recordingConfig.enabled ?? false;
    const durationSec =
      recordingEnabled && item.startedAt && item.endedAt
        ? Math.max(0, Math.round((new Date(item.endedAt).getTime() - new Date(item.startedAt).getTime()) / 1000))
        : 0;
    return {
      callId: item.id,
      tenantId: input.tenantId,
      available: recordingEnabled && item.status === "completed",
      durationSec,
      // Transcription is always PREPARED_OFF in this codebase regardless of flag value —
      // `isCallTranscriptionEnabled()` is reserved for a future real pipeline.
      transcriptionStatus: "prepared_off",
    };
  }

  listAuditLog(tenantId: TenantId): readonly AuditEntry[] {
    return this.stateFor(tenantId).auditLog;
  }

  listCrmTimeline(tenantId: TenantId): readonly CrmTimelineEvent[] {
    return this.stateFor(tenantId).crmTimeline;
  }

  listQueue(tenantId: TenantId): CallQueueItem[] {
    return [...this.stateFor(tenantId).queue.values()];
  }
}

let simulatorSingleton: SimulatorTelephonyProvider | undefined;

/** Shared simulator instance — convenient for callers that don't need isolated instances. */
export function getSimulatorTelephonyProvider(): SimulatorTelephonyProvider {
  if (!simulatorSingleton) simulatorSingleton = new SimulatorTelephonyProvider();
  return simulatorSingleton;
}

export function resetSimulatorTelephonyProviderForTests(): void {
  simulatorSingleton?.reset();
}

/**
 * Real-provider stub. This class can NEVER be constructed successfully: the
 * constructor always throws `BLOCKED_EXTERNAL`, documenting that going live with
 * a real telephony vendor requires a manual code change (not a flag) after
 * `docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md` is completed. Every method also
 * independently throws `NOT_AUTHORIZED` as defense in depth, but they are
 * unreachable because the object can never exist.
 */
export class TwilioTelephonyProvider implements TelephonyProvider {
  readonly kind = "twilio" as const;

  constructor() {
    throw new TelephonyProviderError(
      "BLOCKED_EXTERNAL",
      "TwilioTelephonyProvider is permanently blocked in this codebase. Real telephony " +
        "requires a manual code change after docs/ops/TELEPHONY_PROVIDER_CEO_CHECKLIST.md " +
        "is completed — never a runtime flag or input parameter.",
    );
  }

  enqueueCall(): never {
    throw new TelephonyProviderError("NOT_AUTHORIZED", "real telephony provider disabled");
  }

  startCall(): never {
    throw new TelephonyProviderError("NOT_AUTHORIZED", "real telephony provider disabled");
  }

  endCall(): never {
    throw new TelephonyProviderError("NOT_AUTHORIZED", "real telephony provider disabled");
  }

  getRecordingMeta(): never {
    throw new TelephonyProviderError("NOT_AUTHORIZED", "real telephony provider disabled");
  }

  optOutCheck(): never {
    throw new TelephonyProviderError("NOT_AUTHORIZED", "real telephony provider disabled");
  }
}

/**
 * Integrity check: proves the real provider path is unusable by attempting to
 * construct `TwilioTelephonyProvider` and asserting it always fails with
 * `BLOCKED_EXTERNAL`. Returns `ok: true` today and will keep doing so until this
 * file is manually rewritten with a real, reviewed implementation.
 */
export function assertTelephonyRealProviderDisabled(): { ok: boolean; blocked: true; reason: string } {
  try {
    // eslint-disable-next-line no-new -- intentional: proving construction fails
    new TwilioTelephonyProvider();
    return { ok: false, blocked: true, reason: "twilio_provider_constructed_unexpectedly" };
  } catch (err) {
    if (err instanceof TelephonyProviderError && err.code === "BLOCKED_EXTERNAL") {
      return { ok: true, blocked: true, reason: "real_provider_permanently_blocked" };
    }
    throw err;
  }
}

export function assertTelephonyCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (!assertTelephonyRealProviderDisabled().ok) violations.push("real_provider_not_blocked");
  if (DEFAULT_RECORDING_CONFIG.enabled) violations.push("recording_must_default_off");
  if (isCallTranscriptionEnabled()) violations.push("transcription_must_default_off");

  const sim = new SimulatorTelephonyProvider();
  const campaign = sim.createCampaign({ tenantId: "integrity-tenant-a", name: "integrity-check" });
  if (campaign.status !== "draft") violations.push("campaigns_must_default_to_draft");

  sim.recordConsent({
    tenantId: "integrity-tenant-a",
    phoneE164: "+10000000000",
    status: "opted_out",
    source: "integrity-check",
  });
  const blocked = sim.enqueueCall({
    tenantId: "integrity-tenant-a",
    campaignId: campaign.id,
    phoneE164: "+10000000000",
  });
  if (blocked.status !== "blocked_opt_out") violations.push("opt_out_must_block_enqueue");

  const other = sim.listQueue("integrity-tenant-b");
  if (other.length !== 0) violations.push("tenant_isolation_leak");

  return { ok: violations.length === 0, violations };
}
