/**
 * World-scale HA/DR readiness checklist contract — budget-conscious.
 * Full narrative lives in `docs/ops/HA_DR_SCALE_RUNBOOK.md`; this module is
 * the tested, structured inventory that the doc must stay honest against.
 *
 * `multiRegionEnabled()` is permanently `false` in code — multi-region
 * requires a CEO-approved infra budget and is never toggled by an env var.
 */

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

  return { ok: violations.length === 0, violations };
}
