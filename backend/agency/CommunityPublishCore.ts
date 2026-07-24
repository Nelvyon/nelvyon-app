/**
 * Publish & community management CORE — content inbox, editorial calendar, approval
 * workflow, per-network variants, publish queue, moderation escalation and audit trail.
 *
 * `SimulatorPublishProvider` is the ONLY publish provider in this codebase — it never
 * makes a network call and never sends a real post/DM. `assertPublishDisabled()` returns
 * `disabled: true` (real publish blocked) unless BOTH `oauthConnected` and `ceoApproved`
 * are explicitly `true` — both default to `false`, so publish is disabled by default.
 * Even when the gate opens, the queue still only ever routes through the simulator:
 * there is no real-network provider implemented, by design.
 */

export type CommunityPlatform =
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "facebook"
  | "x"
  | "youtube"
  | "pinterest"
  | "google_business_profile";

export type ContentInboxStatus = "pending_review" | "approved" | "rejected";

export type ContentInboxItem = {
  id: string;
  source: "manual_draft" | "ai_suggested";
  title: string;
  body: string;
  platforms: CommunityPlatform[];
  status: ContentInboxStatus;
  createdAt: string;
};

export type CalendarEntry = {
  id: string;
  contentId: string;
  platform: CommunityPlatform;
  scheduledFor: string;
  status: "planned" | "queued" | "published_simulated" | "blocked_publish_disabled";
};

export type ApprovalWorkflowInput = {
  requiresClientApproval: boolean;
  clientApproved: boolean;
  ceoApproved: boolean;
};

export type ApprovalWorkflowResult = {
  ok: boolean;
  blockers: string[];
};

export type NetworkVariant = {
  platform: CommunityPlatform;
  caption: string;
  hashtags: string[];
  dimensions: string;
  format: string;
};

export type PublishQueueStatus = "blocked_publish_disabled" | "published_simulated";

export type PublishQueueItem = {
  id: string;
  contentId: string;
  platform: CommunityPlatform;
  status: PublishQueueStatus;
  queuedAt: string;
  simulatedAt: string | null;
  blockReason: string | null;
  providerId: "simulator";
};

export type ModerationCategory =
  | "pregunta"
  | "elogio"
  | "spam"
  | "lead"
  | "queja"
  | "queja_legal_sensible";

export type ModerationEvent = {
  id: string;
  contentId: string;
  category: ModerationCategory;
  commentPreview: string;
  escalatedToHuman: boolean;
  at: string;
};

export type MetricsPlaceholder = {
  platform: CommunityPlatform;
  reach: null;
  engagement: null;
  note: string;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  actor: string;
  detail: string;
  at: string;
};

const ESCALATE_ALWAYS: ReadonlySet<ModerationCategory> = new Set(["queja", "queja_legal_sensible"]);
const ESCALATE_KEYWORDS = /demanda|abogad[oa]|denuncia|datos personales|amenaza/i;

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now()}_${seq}`;
}

const CONTENT_INBOX: ContentInboxItem[] = [];
const CALENDAR: CalendarEntry[] = [];
const PUBLISH_QUEUE: PublishQueueItem[] = [];
const MODERATION_LOG: ModerationEvent[] = [];
const AUDIT_LOG: AuditLogEntry[] = [];

export function recordAuditLogEntry(action: string, actor: string, detail: string): AuditLogEntry {
  const entry: AuditLogEntry = { id: nextId("audit"), action, actor, detail, at: new Date().toISOString() };
  AUDIT_LOG.push(entry);
  return entry;
}

export function listAuditLog(): AuditLogEntry[] {
  return [...AUDIT_LOG];
}

export function addToContentInbox(input: {
  source: ContentInboxItem["source"];
  title: string;
  body: string;
  platforms: CommunityPlatform[];
}): ContentInboxItem {
  const item: ContentInboxItem = {
    id: nextId("content"),
    source: input.source,
    title: input.title,
    body: input.body,
    platforms: input.platforms,
    status: "pending_review",
    createdAt: new Date().toISOString(),
  };
  CONTENT_INBOX.push(item);
  recordAuditLogEntry("content_inbox_add", "system", item.id);
  return item;
}

export function listContentInbox(): ContentInboxItem[] {
  return [...CONTENT_INBOX];
}

export function decideContentInboxItem(id: string, decision: "approved" | "rejected", actor: string): ContentInboxItem | null {
  const item = CONTENT_INBOX.find((c) => c.id === id);
  if (!item) return null;
  item.status = decision;
  recordAuditLogEntry("content_inbox_decision", actor, `${id}:${decision}`);
  return item;
}

export function buildEditorialCalendar(
  contentId: string,
  platforms: CommunityPlatform[],
  startDate: Date,
): CalendarEntry[] {
  const entries = platforms.map((platform, i) => {
    const scheduled = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const entry: CalendarEntry = {
      id: nextId("cal"),
      contentId,
      platform,
      scheduledFor: scheduled.toISOString(),
      status: "planned",
    };
    return entry;
  });
  CALENDAR.push(...entries);
  return entries;
}

export function listEditorialCalendar(): CalendarEntry[] {
  return [...CALENDAR];
}

export function evaluateApprovalWorkflow(input: ApprovalWorkflowInput): ApprovalWorkflowResult {
  const blockers: string[] = [];
  if (!input.ceoApproved) blockers.push("ceo_approval_missing");
  if (input.requiresClientApproval && !input.clientApproved) blockers.push("client_approval_missing");
  return { ok: blockers.length === 0, blockers };
}

const NETWORK_FORMAT: Record<CommunityPlatform, { dimensions: string; format: string; maxHashtags: number }> = {
  instagram: { dimensions: "1080x1350", format: "feed_portrait", maxHashtags: 8 },
  tiktok: { dimensions: "1080x1920", format: "vertical_video", maxHashtags: 5 },
  linkedin: { dimensions: "1200x627", format: "feed", maxHashtags: 3 },
  facebook: { dimensions: "1200x630", format: "feed", maxHashtags: 3 },
  x: { dimensions: "1600x900", format: "post", maxHashtags: 2 },
  youtube: { dimensions: "1920x1080", format: "landscape_video", maxHashtags: 3 },
  pinterest: { dimensions: "1000x1500", format: "pin_standard", maxHashtags: 5 },
  google_business_profile: { dimensions: "1200x900", format: "gbp_post", maxHashtags: 0 },
};

export function buildNetworkVariants(input: {
  title: string;
  body: string;
  sector: string;
  platforms: CommunityPlatform[];
}): NetworkVariant[] {
  const baseHashtags = [`#${input.sector.replace(/\s+/g, "")}`, "#nelvyon"];
  return input.platforms.map((platform) => {
    const spec = NETWORK_FORMAT[platform];
    return {
      platform,
      caption: `${input.title} — ${input.body}`.slice(0, platform === "x" ? 280 : 2200),
      hashtags: baseHashtags.slice(0, spec.maxHashtags),
      dimensions: spec.dimensions,
      format: spec.format,
    };
  });
}

/**
 * Real publish is disabled by default. Both `oauthConnected` AND `ceoApproved` must be
 * explicitly `true` to open the gate — even then, the only implemented provider is the
 * simulator, so no real network call is ever made from this module.
 */
export function assertPublishDisabled(input?: {
  oauthConnected?: boolean;
  ceoApproved?: boolean;
}): { disabled: boolean; reason: string } {
  const oauth = input?.oauthConnected === true;
  const ceo = input?.ceoApproved === true;
  if (oauth && ceo) {
    return { disabled: false, reason: "oauth_and_ceo_present_simulator_only" };
  }
  if (!oauth && !ceo) return { disabled: true, reason: "oauth_and_ceo_missing" };
  if (!oauth) return { disabled: true, reason: "oauth_missing" };
  return { disabled: true, reason: "ceo_approval_missing" };
}

/** The only publish provider in this codebase. Never performs a network call. */
export class SimulatorPublishProvider {
  publish(input: { contentId: string; platform: CommunityPlatform; caption: string }): {
    ok: true;
    simulated: true;
    providerId: "simulator";
    publishedAt: string;
  } {
    return { ok: true, simulated: true, providerId: "simulator", publishedAt: new Date().toISOString() };
  }
}

export function enqueuePublishItem(input: {
  contentId: string;
  platform: CommunityPlatform;
  caption: string;
  oauthConnected?: boolean;
  ceoApproved?: boolean;
}): PublishQueueItem {
  const gate = assertPublishDisabled({ oauthConnected: input.oauthConnected, ceoApproved: input.ceoApproved });
  const queuedAt = new Date().toISOString();
  if (gate.disabled) {
    const item: PublishQueueItem = {
      id: nextId("pubq"),
      contentId: input.contentId,
      platform: input.platform,
      status: "blocked_publish_disabled",
      queuedAt,
      simulatedAt: null,
      blockReason: gate.reason,
      providerId: "simulator",
    };
    PUBLISH_QUEUE.push(item);
    recordAuditLogEntry("publish_blocked", "system", `${input.platform}:${gate.reason}`);
    return item;
  }
  const sim = new SimulatorPublishProvider().publish({
    contentId: input.contentId,
    platform: input.platform,
    caption: input.caption,
  });
  const item: PublishQueueItem = {
    id: nextId("pubq"),
    contentId: input.contentId,
    platform: input.platform,
    status: "published_simulated",
    queuedAt,
    simulatedAt: sim.publishedAt,
    blockReason: null,
    providerId: "simulator",
  };
  PUBLISH_QUEUE.push(item);
  recordAuditLogEntry("publish_simulated", "system", `${input.platform}:${input.contentId}`);
  return item;
}

export function listPublishQueue(): PublishQueueItem[] {
  return [...PUBLISH_QUEUE];
}

export function classifyModerationEvent(input: {
  contentId: string;
  category: ModerationCategory;
  commentPreview: string;
}): ModerationEvent {
  const escalate = ESCALATE_ALWAYS.has(input.category) || ESCALATE_KEYWORDS.test(input.commentPreview);
  const event: ModerationEvent = {
    id: nextId("mod"),
    contentId: input.contentId,
    category: input.category,
    commentPreview: input.commentPreview,
    escalatedToHuman: escalate,
    at: new Date().toISOString(),
  };
  MODERATION_LOG.push(event);
  recordAuditLogEntry(
    escalate ? "moderation_escalated" : "moderation_logged",
    "system",
    `${input.contentId}:${input.category}`,
  );
  return event;
}

export function listModerationLog(): ModerationEvent[] {
  return [...MODERATION_LOG];
}

export function buildMetricsPlaceholders(platforms: CommunityPlatform[]): MetricsPlaceholder[] {
  return platforms.map((platform) => ({
    platform,
    reach: null,
    engagement: null,
    note: "placeholder — sin publish real, sin métricas reales hasta autorización OAuth + CEO",
  }));
}

export const COMMUNITY_PUBLISH_ROLLBACK_PLAN: readonly string[] = [
  "Detener inmediatamente el envío de nuevos items a enqueuePublishItem",
  "Revocar cualquier credencial OAuth si alguna vez se conectó una cuenta real",
  "Mantener SimulatorPublishProvider como único proveedor — nunca activar un proveedor real sin este checklist completo",
  "Revisar el audit log completo (listAuditLog) antes de reintentar cualquier publicación",
  "NELVYON_PAID_SOCIAL_ENABLED y flags de publish reales permanecen en 0 hasta aprobación CEO explícita",
];

export function resetCommunityPublishStateForTests(): void {
  CONTENT_INBOX.length = 0;
  CALENDAR.length = 0;
  PUBLISH_QUEUE.length = 0;
  MODERATION_LOG.length = 0;
  AUDIT_LOG.length = 0;
  seq = 0;
}

/**
 * Self-check used by tests/CI. Exercises real code paths (including in-memory queue/log
 * writes), then clears the synthetic in-memory state it touched so calling it never leaves
 * residue in shared module state.
 */
export function assertCommunityPublishCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const defaultGate = assertPublishDisabled();
  if (!defaultGate.disabled) violations.push("publish_must_be_disabled_by_default");

  const oauthOnly = assertPublishDisabled({ oauthConnected: true });
  if (!oauthOnly.disabled) violations.push("oauth_alone_must_not_enable_publish");

  const ceoOnly = assertPublishDisabled({ ceoApproved: true });
  if (!ceoOnly.disabled) violations.push("ceo_alone_must_not_enable_publish");

  const blocked = enqueuePublishItem({ contentId: "integrity-check", platform: "instagram", caption: "x" });
  if (blocked.status !== "blocked_publish_disabled") violations.push("default_enqueue_must_be_blocked");

  const complaint = classifyModerationEvent({
    contentId: "integrity-check",
    category: "queja_legal_sensible",
    commentPreview: "quiero poner una denuncia",
  });
  if (!complaint.escalatedToHuman) violations.push("legal_sensitive_complaint_must_escalate");

  resetCommunityPublishStateForTests();
  return { ok: violations.length === 0, violations };
}
