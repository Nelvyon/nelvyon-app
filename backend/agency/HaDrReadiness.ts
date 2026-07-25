/**
 * World-scale HA/DR readiness checklist contract — budget-conscious.
 * Full narrative lives in `docs/ops/HA_DR_SCALE_RUNBOOK.md`; this module is
 * the tested, structured inventory that the doc must stay honest against.
 *
 * `multiRegionEnabled()` is permanently `false` in code — multi-region
 * requires a CEO-approved infra budget and is never toggled by an env var.
 *
 * Single-region HA scope (IMPLEMENTED_VERIFIED, this file): RPO/RTO targets,
 * a capacity smoke helper over the real `/api/health*` probes, a graceful
 * degradation pattern check, rate-limit presence, a stateless-assertion that
 * is honest about known in-memory caveats, and a rollback checklist.
 */

import { getNelvyonProbeTargets } from "../observability/NelvyonObservabilityAdapter";

export type HaDrItemStatus = "DOCUMENTED" | "IMPLEMENTED_VERIFIED" | "BLOCKED_EXTERNAL";

export type HaDrChecklistItem = {
  id: string;
  title: string;
  docPath: string;
  status: HaDrItemStatus;
  note: string;
};

export const HA_DR_RUNBOOK_PATH = "docs/ops/HA_DR_SCALE_RUNBOOK.md";

export const HA_DR_CHECKLIST: readonly HaDrChecklistItem[] = [
  {
    id: "rpo_rto_targets",
    title: "RPO/RTO targets defined",
    docPath: HA_DR_RUNBOOK_PATH,
    status: "DOCUMENTED",
    note: "RPO <= 24h (daily Railway Postgres backup), RTO <= 4h (manual restore drill + redeploy) — see runbook for the full table.",
  },
  {
    id: "backup_restore",
    title: "Backups + restore drill",
    docPath: "docs/ops/POSTGRES_RESTORE_DRILL.md",
    status: "DOCUMENTED",
    note: "Backup workflow .github/workflows/db-backup.yml + scripts/run-postgres-restore-drill.mjs already exist.",
  },
  {
    id: "health_checks",
    title: "Health check endpoints",
    docPath: HA_DR_RUNBOOK_PATH,
    status: "IMPLEMENTED_VERIFIED",
    note: "/api/health, /api/health/live, /api/health/ready, /api/health/deep already shipped (see NelvyonObservabilityAdapter.getNelvyonProbeTargets).",
  },
  {
    id: "rate_limits",
    title: "Rate limiting on send/API paths",
    docPath: HA_DR_RUNBOOK_PATH,
    status: "DOCUMENTED",
    note: "Send rate limits enforced via CampaignsLegalTechnicalGate.sendRateLimitPerHourMax; general API throttling documented as an ops practice, not a paid WAF product.",
  },
  {
    id: "queues",
    title: "Queue-backed async workloads",
    docPath: HA_DR_RUNBOOK_PATH,
    status: "DOCUMENTED",
    note: "backend/queue + workflow idempotency (4 min window) absorb bursts without a paid message broker.",
  },
  {
    id: "cache_cdn_optional",
    title: "Optional cache/CDN",
    docPath: HA_DR_RUNBOOK_PATH,
    status: "DOCUMENTED",
    note: "Railway edge + Next.js static caching cover current traffic; a paid CDN (Cloudflare/Fastly) stays optional/off pending real traffic need.",
  },
  {
    id: "kill_switches",
    title: "Kill switches / rollback flags",
    docPath: HA_DR_RUNBOOK_PATH,
    status: "IMPLEMENTED_VERIFIED",
    note: "Feature flags already gate OS/MCP/OpenClaw/Visual/campaign paths — see docs/HANDOVER.md rollback block.",
  },
  {
    id: "multi_region",
    title: "Multi-region deployment",
    docPath: HA_DR_RUNBOOK_PATH,
    status: "BLOCKED_EXTERNAL",
    note: "Requires CEO-approved multi-region infra budget — not enabled, not planned without explicit approval.",
  },
] as const;

/** Staging health URL follows this pattern; `{staging-subdomain}` is filled from the live Railway deployment. */
export const HA_DR_STAGING_HEALTH_URL_PATTERN = "https://{staging-subdomain}.up.railway.app/api/health/deep";

export function listHaDrChecklist(): HaDrChecklistItem[] {
  return [...HA_DR_CHECKLIST];
}

export function getHaDrItem(id: string): HaDrChecklistItem | undefined {
  return HA_DR_CHECKLIST.find((i) => i.id === id);
}

/** Always false — multi-region is a budget decision, never a runtime toggle. */
export function isMultiRegionEnabled(): false {
  return false;
}

export function buildStagingHealthUrl(subdomain: string): string {
  return HA_DR_STAGING_HEALTH_URL_PATTERN.replace("{staging-subdomain}", subdomain);
}

// ── RPO / RTO constants — must match docs/ops/HA_DR_SCALE_RUNBOOK.md ──────────────

/** Recovery Point Objective — max acceptable data loss window (daily Railway Postgres backup). */
export const RPO_TARGET_HOURS = 24;
/** Recovery Time Objective — max acceptable downtime for a manual restore + redeploy. */
export const RTO_TARGET_HOURS = 4;

// ── Capacity smoke helper ──────────────────────────────────────────────────────────
// Lightweight concurrency check over the real health probes — NOT a load-testing
// product. Verifies the app answers correctly under a small burst of concurrent
// requests, which is the honest bar for a single-region, budget-conscious setup.
// The fetcher is always injected by the caller (script/test) — this module never
// calls the network itself, so it is safe to import anywhere, including tests.

export type CapacitySmokeFetcher = (url: string) => Promise<{ status: number }>;

export type CapacitySmokeProbeResult = {
  id: string;
  path: string;
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
};

export type CapacitySmokeResult = {
  ok: boolean;
  concurrency: number;
  maxLatencyMs: number;
  results: CapacitySmokeProbeResult[];
};

export type CapacitySmokeInput = {
  baseUrl: string;
  fetcher: CapacitySmokeFetcher;
  /** Concurrent requests fired per health probe endpoint. Default 5 — deliberately small/free-tier-safe. */
  concurrency?: number;
  /** Any single request slower than this fails the smoke. Default 3000ms. */
  maxLatencyMs?: number;
};

/** Fires `concurrency` concurrent requests at each `/api/health*` probe and checks status + latency. */
export async function runCapacitySmoke(input: CapacitySmokeInput): Promise<CapacitySmokeResult> {
  const concurrency = input.concurrency ?? 5;
  const maxLatencyMs = input.maxLatencyMs ?? 3000;
  const targets = getNelvyonProbeTargets(input.baseUrl);

  const results: CapacitySmokeProbeResult[] = [];
  for (const target of targets) {
    const attempts = await Promise.all(
      Array.from({ length: concurrency }, async () => {
        const start = Date.now();
        try {
          const res = await input.fetcher(target.path);
          const latencyMs = Date.now() - start;
          return {
            id: target.id,
            path: target.path,
            ok: res.status === target.expectedStatus && latencyMs <= maxLatencyMs,
            statusCode: res.status,
            latencyMs,
            error: null,
          };
        } catch (err) {
          return {
            id: target.id,
            path: target.path,
            ok: false,
            statusCode: null,
            latencyMs: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );
    results.push(...attempts);
  }

  return {
    ok: results.every((r) => r.ok),
    concurrency,
    maxLatencyMs,
    results,
  };
}

// ── Graceful degradation pattern ───────────────────────────────────────────────────
// Real, already-shipped pattern: `apps/web/src/lib/bffDegraded.ts` marks BFF
// responses `{ degraded: true, degraded_reason }` instead of hard-failing when an
// upstream/OAuth integration is unavailable. This documents/validates the
// contract; it does not re-implement it (no duplication of the actual BFF code).

export const GRACEFUL_DEGRADATION_MODULE_PATH = "apps/web/src/lib/bffDegraded.ts";

export const GRACEFUL_DEGRADATION_REASON_CODES = [
  "upstream_unavailable",
  "oauth_not_configured",
  "no_live_data",
] as const;
export type GracefulDegradationReasonCode = (typeof GRACEFUL_DEGRADATION_REASON_CODES)[number];

export function isGracefulDegradationReasonCode(value: string): value is GracefulDegradationReasonCode {
  return (GRACEFUL_DEGRADATION_REASON_CODES as readonly string[]).includes(value);
}

/** Shape every degraded BFF response must have — mirrors `BffDegradedMeta` in `bffDegraded.ts`. */
export function isWellFormedDegradedResponse(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return p.degraded === true && typeof p.degraded_reason === "string" && p.degraded_reason.length > 0;
}

// ── Rate-limit presence check ──────────────────────────────────────────────────────
// Decoupled from `CampaignsLegalTechnicalGate` (which already enforces this for
// campaign sends) — this is the generic single-region HA claim: SOME rate limit
// must be declared and sane wherever a send-like or high-cost path exists.

export type RateLimitPresenceResult = { ok: boolean; reason: string | null };

const MAX_SANE_RATE_LIMIT_PER_HOUR = 1_000_000;

export function evaluateRateLimitPresence(perHourMax: number | null | undefined): RateLimitPresenceResult {
  if (perHourMax == null) return { ok: false, reason: "no_rate_limit_declared" };
  if (!Number.isFinite(perHourMax) || perHourMax <= 0) return { ok: false, reason: "rate_limit_not_positive" };
  if (perHourMax > MAX_SANE_RATE_LIMIT_PER_HOUR) return { ok: false, reason: "rate_limit_not_sane" };
  return { ok: true, reason: null };
}

// ── Stateless assertion metadata ───────────────────────────────────────────────────
// Honest split: what is genuinely stateless today (safe to run N replicas behind
// Railway) vs. known in-memory state that currently assumes a single instance.
// Never claim "fully stateless" without listing the caveats below.

export type StatelessAssertionMetadata = {
  statelessConfirmed: string[];
  inMemoryCaveats: string[];
  singleInstanceAssumed: boolean;
};

export const HA_DR_STATELESS_ASSERTION: StatelessAssertionMetadata = {
  statelessConfirmed: [
    "SaaS session auth is a JWT in an httpOnly cookie (requireSaasContext) — no server-side session store.",
    "Platform auth is claims-based (requirePlatformClaims) — no server-side session store.",
    "Persistent business data (tenants, contacts, campaigns, workflows, deliverables) lives in Postgres, not process memory.",
    "Workflow idempotency window is DB-backed (see CLAUDE.md, 4-minute window), not an in-process cache.",
  ],
  inMemoryCaveats: [
    "MassSendTechnicalControls suppression list + send-rate-limit window are in-memory Maps — correct for a single Railway instance, would under-count/under-suppress across N replicas without a shared store (Redis/Postgres) if horizontal scaling is ever enabled.",
    "OpsObservabilityCore metrics counters and alert log are in-memory per-instance — acceptable for current single-instance deploy; would need aggregation (or a shared store) before scaling to N replicas.",
    "PrivateVectorRagCore / StagingSharedMemoryMcpHarness synthetic stores are in-memory by design (staging-only, no real tenant data) — out of scope for this production statelessness claim.",
  ],
  singleInstanceAssumed: true,
};

// ── Rollback checklist ──────────────────────────────────────────────────────────────

export const HA_DR_ROLLBACK_CHECKLIST: readonly string[] = [
  "1. Identify the last known-good Railway deployment (Deployments tab, previous successful build).",
  "2. In Railway, redeploy that previous build (or `railway rollback` if using the CLI) for the affected service.",
  "3. Verify /api/health/deep returns 200 on the rolled-back deployment before declaring the incident resolved.",
  "4. If the incident was caused by a feature flag, flip it to 0/unset first — this is faster than a full redeploy (see docs/HANDOVER.md rollback list).",
  "5. If the incident involved a DB migration, do NOT auto-rollback the migration — follow docs/ops/POSTGRES_RESTORE_DRILL.md instead (data-safety first).",
  "6. Post-incident: log the timeline and root cause in docs/KNOWN_ISSUES.md or docs/DECISIONS.md as appropriate.",
] as const;

export function assertHaDrReadinessIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const item of HA_DR_CHECKLIST) {
    if (!item.docPath) violations.push(`missing_doc_path:${item.id}`);
    if (!item.note || item.note.length < 15) violations.push(`missing_or_short_note:${item.id}`);
  }

  const multiRegion = getHaDrItem("multi_region");
  if (!multiRegion || multiRegion.status !== "BLOCKED_EXTERNAL") {
    violations.push("multi_region_must_stay_blocked_external");
  }
  if ((isMultiRegionEnabled() as boolean) !== false) {
    violations.push("multi_region_enabled_must_always_be_false");
  }

  const healthUrl = buildStagingHealthUrl("ideal-victory-staging");
  if (!/^https:\/\/[a-z0-9-]+\.up\.railway\.app\/api\/health\/deep$/.test(healthUrl)) {
    violations.push("staging_health_url_pattern_invalid");
  }

  const requiredIds = ["rpo_rto_targets", "backup_restore", "health_checks", "kill_switches", "multi_region"];
  for (const id of requiredIds) {
    if (!getHaDrItem(id)) violations.push(`missing_checklist_item:${id}`);
  }

  if (RPO_TARGET_HOURS <= 0 || RTO_TARGET_HOURS <= 0) violations.push("rpo_rto_constants_must_be_positive");
  if (RTO_TARGET_HOURS > RPO_TARGET_HOURS * 2) violations.push("rto_unexpectedly_far_from_rpo");

  // `runCapacitySmoke` is async (real fetcher I/O) and is verified separately in
  // HaDrReadiness.test.ts with a fake fetcher — kept out of this sync assertion.

  const rateLimitOk = evaluateRateLimitPresence(500);
  if (!rateLimitOk.ok) violations.push("rate_limit_presence_should_pass_for_sane_value");
  const rateLimitMissing = evaluateRateLimitPresence(null);
  if (rateLimitMissing.ok) violations.push("rate_limit_presence_should_fail_when_absent");
  const rateLimitInsane = evaluateRateLimitPresence(-5);
  if (rateLimitInsane.ok) violations.push("rate_limit_presence_should_fail_for_non_positive_value");

  if (!isGracefulDegradationReasonCode("upstream_unavailable")) violations.push("known_degradation_code_must_validate");
  if (isGracefulDegradationReasonCode("not_a_real_code")) violations.push("unknown_degradation_code_must_not_validate");
  if (!isWellFormedDegradedResponse({ degraded: true, degraded_reason: "upstream_unavailable" })) {
    violations.push("well_formed_degraded_response_must_validate");
  }
  if (isWellFormedDegradedResponse({ degraded: true })) violations.push("degraded_response_without_reason_must_not_validate");

  if (HA_DR_STATELESS_ASSERTION.statelessConfirmed.length === 0) violations.push("stateless_confirmed_must_not_be_empty");
  if (HA_DR_STATELESS_ASSERTION.inMemoryCaveats.length === 0) {
    violations.push("stateless_assertion_must_honestly_list_in_memory_caveats");
  }
  if (!HA_DR_STATELESS_ASSERTION.singleInstanceAssumed) violations.push("single_instance_assumption_must_be_true_today");

  if (HA_DR_ROLLBACK_CHECKLIST.length < 3) violations.push("rollback_checklist_too_short");

  return { ok: violations.length === 0, violations };
}
