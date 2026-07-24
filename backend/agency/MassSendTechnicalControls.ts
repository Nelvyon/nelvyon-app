/**
 * Mass commercial send — technical reinforcement helpers (ADR-053/ADR-055 extension).
 *
 * These are TECHNICAL building blocks consumed by `CampaignsLegalTechnicalGate.ts` as
 * additional, informational hardening. None of them can ever authorize a real send by
 * themselves: `claimReadyLegal` stays hardcoded `false` and `getCampaignLaunchBlockReason`
 * stays a hard block regardless of what these helpers report. See
 * `docs/ops/CAMPAIGNS_LEGAL_TECHNICAL_CHECKLIST.md`.
 */

// ---------------------------------------------------------------------------
// Suppression list — bounces / complaints / manual opt-outs
// ---------------------------------------------------------------------------

export type SuppressionReason = "bounce" | "complaint" | "manual_optout";

export type SuppressionEntry = {
  email: string;
  reason: SuppressionReason;
  addedAt: string;
};

const SUPPRESSION_LIST = new Map<string, SuppressionEntry>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function addToSuppressionList(email: string, reason: SuppressionReason): SuppressionEntry {
  const entry: SuppressionEntry = { email: normalizeEmail(email), reason, addedAt: new Date().toISOString() };
  SUPPRESSION_LIST.set(entry.email, entry);
  return entry;
}

export function isSuppressed(email: string): boolean {
  return SUPPRESSION_LIST.has(normalizeEmail(email));
}

/** Filters a recipient list against the suppression list — must be called before every send. */
export function filterSuppressedRecipients(emails: string[]): { allowed: string[]; suppressed: string[] } {
  const allowed: string[] = [];
  const suppressed: string[] = [];
  for (const email of emails) {
    if (isSuppressed(email)) suppressed.push(email);
    else allowed.push(email);
  }
  return { allowed, suppressed };
}

export function listSuppressionEntries(): SuppressionEntry[] {
  return [...SUPPRESSION_LIST.values()];
}

export function resetSuppressionListForTests(): void {
  SUPPRESSION_LIST.clear();
}

// ---------------------------------------------------------------------------
// Unsubscribe proof — one-click link + List-Unsubscribe headers (RFC 2369 / RFC 8058)
// ---------------------------------------------------------------------------

export type UnsubscribeProofInput = {
  hasOneClickLink: boolean;
  hasListUnsubscribeHeader: boolean;
  hasListUnsubscribePostHeader: boolean;
};

export type UnsubscribeProofResult = { ok: boolean; missing: string[] };

export function checkUnsubscribeProof(input: UnsubscribeProofInput): UnsubscribeProofResult {
  const missing: string[] = [];
  if (!input.hasOneClickLink) missing.push("one_click_unsubscribe_link");
  if (!input.hasListUnsubscribeHeader) missing.push("list_unsubscribe_header_rfc2369");
  if (!input.hasListUnsubscribePostHeader) missing.push("list_unsubscribe_post_header_rfc8058");
  return { ok: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Rate limit — in-memory sliding window (per-process; real prod limiter lives at SES/queue level)
// ---------------------------------------------------------------------------

const SEND_TIMESTAMPS: number[] = [];
const HOUR_MS = 60 * 60 * 1000;

export function recordSendForRateLimit(atMs: number = Date.now()): void {
  SEND_TIMESTAMPS.push(atMs);
}

export function currentHourSendCount(nowMs: number = Date.now()): number {
  return SEND_TIMESTAMPS.filter((t) => nowMs - t < HOUR_MS).length;
}

export type RateLimitCheckResult = { ok: boolean; currentCount: number; maxPerHour: number; remaining: number };

export function checkRateLimit(maxPerHour: number, nowMs: number = Date.now()): RateLimitCheckResult {
  const currentCount = currentHourSendCount(nowMs);
  const remaining = Math.max(0, maxPerHour - currentCount);
  return { ok: Number.isFinite(maxPerHour) && maxPerHour > 0 && currentCount < maxPerHour, currentCount, maxPerHour, remaining };
}

export function resetRateLimitWindowForTests(): void {
  SEND_TIMESTAMPS.length = 0;
}

// ---------------------------------------------------------------------------
// Warming metadata — IP/domain warm-up schedule (declarative, no auto-send)
// ---------------------------------------------------------------------------

export type WarmingStage = { day: number; maxSendsPerDay: number };

/** Conservative default warm-up curve. Purely declarative metadata — never auto-executed. */
export const DEFAULT_WARMING_PLAN: readonly WarmingStage[] = [
  { day: 1, maxSendsPerDay: 50 },
  { day: 2, maxSendsPerDay: 100 },
  { day: 3, maxSendsPerDay: 200 },
  { day: 7, maxSendsPerDay: 1_000 },
  { day: 14, maxSendsPerDay: 5_000 },
  { day: 30, maxSendsPerDay: 20_000 },
] as const;

export function getWarmingStageForDay(dayNumber: number, plan: readonly WarmingStage[] = DEFAULT_WARMING_PLAN): WarmingStage {
  const sorted = [...plan].sort((a, b) => a.day - b.day);
  let current = sorted[0]!;
  for (const stage of sorted) {
    if (dayNumber >= stage.day) current = stage;
  }
  return current;
}

export type WarmingMetadata = {
  startedAt: string;
  dayNumber: number;
  stage: WarmingStage;
  plan: readonly WarmingStage[];
  note: string;
};

export function buildWarmingMetadata(startedAtIso: string, now: Date = new Date()): WarmingMetadata {
  const startedAt = new Date(startedAtIso);
  const dayNumber = Math.max(1, Math.floor((now.getTime() - startedAt.getTime()) / (24 * HOUR_MS)) + 1);
  return {
    startedAt: startedAtIso,
    dayNumber,
    stage: getWarmingStageForDay(dayNumber),
    plan: DEFAULT_WARMING_PLAN,
    note: "Metadata declarativa — no ejecuta envíos automáticamente; el caller debe respetar maxSendsPerDay.",
  };
}

// ---------------------------------------------------------------------------
// Reputation score — synthetic placeholder (NOT a real ISP feedback-loop integration)
// ---------------------------------------------------------------------------

export type ReputationScoreSnapshot = {
  score: number;
  source: "synthetic_placeholder";
  note: string;
  generatedAt: string;
};

/**
 * Always returns a synthetic placeholder — there is no real integration with Google
 * Postmaster Tools, Microsoft SNDS, or JMRPP feedback loops in this codebase. Never use
 * this value to make real sending decisions.
 */
export function getSyntheticReputationScoreStub(): ReputationScoreSnapshot {
  return {
    score: 100,
    source: "synthetic_placeholder",
    note: "Placeholder sintético — sin integración real con Postmaster Tools/SNDS/JMRPP. No usar para decisiones de envío real.",
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Template audit — spam-trigger words, mandatory unsubscribe link, physical address (CAN-SPAM)
// ---------------------------------------------------------------------------

export type TemplateAuditInput = {
  html: string;
  hasUnsubscribeLink: boolean;
  hasPhysicalAddress: boolean;
};

export type TemplateAuditResult = { ok: boolean; issues: string[] };

const SPAM_TRIGGER_PHRASES = [
  "gratis!!!",
  "haz clic aquí ya",
  "gana dinero rápido",
  "100% gratis",
  "oferta exclusiva por tiempo limitado",
  "actúa ahora",
  "sin compromiso ni riesgo",
];

export function auditEmailTemplate(input: TemplateAuditInput): TemplateAuditResult {
  const issues: string[] = [];
  if (!input.hasUnsubscribeLink) issues.push("missing_unsubscribe_link");
  if (!input.hasPhysicalAddress) issues.push("missing_physical_address_can_spam");
  const lower = input.html.toLowerCase();
  for (const phrase of SPAM_TRIGGER_PHRASES) {
    if (lower.includes(phrase)) issues.push(`spam_trigger_phrase:${phrase}`);
  }
  return { ok: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// Integrity self-check
// ---------------------------------------------------------------------------

export function assertMassSendTechnicalControlsIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  addToSuppressionList("blocked@nelvyon.test", "complaint");
  if (!isSuppressed("BLOCKED@nelvyon.test")) violations.push("suppression_check_must_be_case_insensitive");
  const { allowed, suppressed } = filterSuppressedRecipients(["blocked@nelvyon.test", "ok@nelvyon.test"]);
  if (suppressed.length !== 1 || allowed.length !== 1) violations.push("filter_suppressed_recipients_mismatch");
  resetSuppressionListForTests();

  const missingProof = checkUnsubscribeProof({
    hasOneClickLink: false,
    hasListUnsubscribeHeader: false,
    hasListUnsubscribePostHeader: false,
  });
  if (missingProof.ok) violations.push("unsubscribe_proof_must_fail_when_all_missing");

  const fullProof = checkUnsubscribeProof({
    hasOneClickLink: true,
    hasListUnsubscribeHeader: true,
    hasListUnsubscribePostHeader: true,
  });
  if (!fullProof.ok) violations.push("unsubscribe_proof_must_pass_when_complete");

  resetRateLimitWindowForTests();
  for (let i = 0; i < 5; i += 1) recordSendForRateLimit();
  const underLimit = checkRateLimit(10);
  if (!underLimit.ok) violations.push("rate_limit_should_allow_under_cap");
  const overLimit = checkRateLimit(5);
  if (overLimit.ok) violations.push("rate_limit_should_block_at_cap");
  resetRateLimitWindowForTests();

  if (DEFAULT_WARMING_PLAN.length === 0) violations.push("warming_plan_must_not_be_empty");
  const day1 = getWarmingStageForDay(1);
  if (day1.maxSendsPerDay > 100) violations.push("warming_day1_must_be_conservative");

  const rep = getSyntheticReputationScoreStub();
  if (rep.source !== "synthetic_placeholder") violations.push("reputation_score_must_stay_synthetic");

  const badTemplate = auditEmailTemplate({
    html: "<p>100% GRATIS — actúa ahora!</p>",
    hasUnsubscribeLink: false,
    hasPhysicalAddress: false,
  });
  if (badTemplate.ok) violations.push("template_audit_must_flag_bad_template");

  const goodTemplate = auditEmailTemplate({
    html: "<p>Gracias por tu interés.</p><footer>NELVYON S.L., Calle Ejemplo 1, Madrid</footer>",
    hasUnsubscribeLink: true,
    hasPhysicalAddress: true,
  });
  if (!goodTemplate.ok) violations.push("template_audit_false_positive_on_clean_template");

  return { ok: violations.length === 0, violations };
}
