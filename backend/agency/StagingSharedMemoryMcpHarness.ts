/**
 * Staging-only synthetic harness for Shared Memory + MCP drills (ADR-055 closure).
 *
 * Runs ONLY when BOTH explicit staging-synthetic flags are set:
 *  - `NELVYON_SHARED_MEMORY_STAGING=1` — synthetic SM drills. NEVER implies productive
 *    Shared Memory (`NELVYON_SHARED_MEMORY_ENABLED` stays a separate, still-OFF flag).
 *  - `NELVYON_MCP_STAGING_SYNTHETIC=1` — synthetic MCP drills without productive MCP.
 *
 * Uses SYNTHETIC tenant A/B data only — never Pepito, never real customer data.
 * Demonstrates RLS-style tenant isolation, an audit log, deny-by-default permissions,
 * minimal permission sets, and a documented rollback flag list. Optionally hooks into
 * the existing OpenClaw staging coordinator when it is independently authorized.
 *
 * MCP productive remains fail-closed: `isMcpProductiveEnabled()` requires BOTH
 * `NELVYON_MCP_PRODUCTIVE_ENABLED=1` AND staging synthetic mode — it is never true by
 * accident, and is never set in this repo's defaults.
 */

import { isOpenClawStagingAuthorized, runOpenClawStagingCoordination } from "./OpenClawStagingCoordinator";

export type SyntheticTenantId = "synthetic-tenant-a" | "synthetic-tenant-b";

export type SyntheticMemoryRecord = {
  id: string;
  tenantId: SyntheticTenantId;
  key: string;
  value: string;
};

export type SmMcpAuditLogEntry = {
  at: string;
  actorTenantId: string;
  action: string;
  targetTenantId: string;
  allowed: boolean;
  reason: string;
};

export type SmMcpPermissionRole = "reader" | "writer" | "admin";
export type SmMcpPermissionAction = "read" | "write" | "delete" | "admin_rotate";

/** Synthetic-only fixtures — never Pepito, never a real tenant. */
const SYNTHETIC_RECORDS: readonly SyntheticMemoryRecord[] = [
  { id: "mem-a-1", tenantId: "synthetic-tenant-a", key: "preference", value: "tono_formal" },
  { id: "mem-a-2", tenantId: "synthetic-tenant-a", key: "last_brief", value: "brief-sintetico-a" },
  { id: "mem-b-1", tenantId: "synthetic-tenant-b", key: "preference", value: "tono_casual" },
  { id: "mem-b-2", tenantId: "synthetic-tenant-b", key: "last_brief", value: "brief-sintetico-b" },
];

const auditLog: SmMcpAuditLogEntry[] = [];

export function resetStagingSharedMemoryMcpHarnessForTests(): void {
  auditLog.length = 0;
}

export function listSmMcpAuditLog(): readonly SmMcpAuditLogEntry[] {
  return auditLog;
}

function pushAudit(entry: Omit<SmMcpAuditLogEntry, "at">): void {
  auditLog.push({ ...entry, at: new Date().toISOString() });
}

function envFlagOn(name: string): boolean {
  const v = process.env[name]?.trim();
  return v === "1" || v?.toUpperCase() === "ON" || v?.toLowerCase() === "true";
}

export function isSharedMemoryStagingSyntheticAuthorized(): boolean {
  return envFlagOn("NELVYON_SHARED_MEMORY_STAGING");
}

export function isMcpStagingSyntheticAuthorized(): boolean {
  return envFlagOn("NELVYON_MCP_STAGING_SYNTHETIC");
}

/**
 * Fail-closed productive MCP gate — requires BOTH the productive flag AND staging
 * synthetic mode. This is intentionally never satisfiable by a single flag flip, and
 * is never enabled in this repo's committed defaults.
 */
export function isMcpProductiveEnabled(): boolean {
  return envFlagOn("NELVYON_MCP_PRODUCTIVE_ENABLED") && isMcpStagingSyntheticAuthorized();
}

const MIN_PERMISSIONS: Record<SmMcpPermissionRole, SmMcpPermissionAction[]> = {
  reader: ["read"],
  writer: ["read", "write"],
  admin: ["read", "write", "delete", "admin_rotate"],
};

export function minPermissionsForRole(role: SmMcpPermissionRole): SmMcpPermissionAction[] {
  return [...MIN_PERMISSIONS[role]];
}

/** Deny-by-default: any action outside the role's minimal set is denied, always audited. */
export function checkSmPermission(input: {
  role: SmMcpPermissionRole;
  action: SmMcpPermissionAction;
  actorTenantId: string;
}): { allowed: boolean; reason: string } {
  const allowedSet = new Set(minPermissionsForRole(input.role));
  const allowed = allowedSet.has(input.action);
  const reason = allowed ? "within_min_permissions" : "deny_by_default_not_in_role";
  pushAudit({
    actorTenantId: input.actorTenantId,
    action: `permission_check:${input.action}`,
    targetTenantId: input.actorTenantId,
    allowed,
    reason,
  });
  return { allowed, reason };
}

/** RLS-style isolation: tenant A can never read tenant B's synthetic memory, and vice versa. */
export function readSyntheticMemory(input: {
  requestingTenantId: SyntheticTenantId;
  targetTenantId: SyntheticTenantId;
}): { allowed: boolean; records: SyntheticMemoryRecord[]; reason: string } {
  const allowed = input.requestingTenantId === input.targetTenantId;
  const records = allowed ? SYNTHETIC_RECORDS.filter((r) => r.tenantId === input.targetTenantId) : [];
  const reason = allowed ? "tenant_match" : "rls_isolation_denied_cross_tenant";
  pushAudit({
    actorTenantId: input.requestingTenantId,
    action: "read_synthetic_memory",
    targetTenantId: input.targetTenantId,
    allowed,
    reason,
  });
  return { allowed, records, reason };
}

export type StagingSharedMemoryMcpDrillResult = {
  ok: boolean;
  mode: "disabled" | "synthetic";
  smAuthorized: boolean;
  mcpAuthorized: boolean;
  mcpProductiveEnabled: boolean;
  tenantIsolationOk: boolean;
  denyByDefaultOk: boolean;
  minPermissionsOk: boolean;
  openClawHook: { ran: boolean; ok: boolean; detail: string };
  auditLogEntries: number;
  rollbackFlags: string[];
  blockers: string[];
};

const ROLLBACK_FLAGS: string[] = [
  "NELVYON_SHARED_MEMORY_STAGING=0",
  "NELVYON_MCP_STAGING_SYNTHETIC=0",
  "NELVYON_MCP_PRODUCTIVE_ENABLED=0 (never set in prod without separate CEO authorization)",
  "NELVYON_SHARED_MEMORY_ENABLED=0 (productive SM stays OFF)",
];

/**
 * Full synthetic drill: tenant isolation, deny-by-default, minimal permissions,
 * audit trail, and an optional OpenClaw staging coordinator hook. Fail-closed when
 * either staging flag is missing — never runs against real data or a live MCP.
 */
export async function runStagingSharedMemoryMcpDrill(): Promise<StagingSharedMemoryMcpDrillResult> {
  const smAuthorized = isSharedMemoryStagingSyntheticAuthorized();
  const mcpAuthorized = isMcpStagingSyntheticAuthorized();
  const mcpProductiveEnabled = isMcpProductiveEnabled();
  const blockers: string[] = [];

  if (!smAuthorized || !mcpAuthorized) {
    if (!smAuthorized) blockers.push("shared_memory_staging_off");
    if (!mcpAuthorized) blockers.push("mcp_staging_synthetic_off");
    return {
      ok: false,
      mode: "disabled",
      smAuthorized,
      mcpAuthorized,
      mcpProductiveEnabled,
      tenantIsolationOk: false,
      denyByDefaultOk: false,
      minPermissionsOk: false,
      openClawHook: { ran: false, ok: false, detail: "harness_disabled" },
      auditLogEntries: auditLog.length,
      rollbackFlags: ROLLBACK_FLAGS,
      blockers,
    };
  }

  const own = readSyntheticMemory({
    requestingTenantId: "synthetic-tenant-a",
    targetTenantId: "synthetic-tenant-a",
  });
  const cross = readSyntheticMemory({
    requestingTenantId: "synthetic-tenant-a",
    targetTenantId: "synthetic-tenant-b",
  });
  const tenantIsolationOk = own.allowed && own.records.length > 0 && !cross.allowed && cross.records.length === 0;

  const readerRead = checkSmPermission({ role: "reader", action: "read", actorTenantId: "synthetic-tenant-a" });
  const readerWriteDenied = checkSmPermission({
    role: "reader",
    action: "write",
    actorTenantId: "synthetic-tenant-a",
  });
  const denyByDefaultOk = readerRead.allowed && !readerWriteDenied.allowed;
  const minPermissionsOk =
    minPermissionsForRole("reader").length === 1 && minPermissionsForRole("admin").length === 4;

  let openClawHook: StagingSharedMemoryMcpDrillResult["openClawHook"] = {
    ran: false,
    ok: false,
    detail: "openclaw_not_authorized",
  };
  if (isOpenClawStagingAuthorized()) {
    const r = await runOpenClawStagingCoordination({
      tenantId: "synthetic-tenant-a",
      briefId: "sm-mcp-synthetic-drill",
      idempotencyKey: `sm-mcp-drill-${Date.now()}`,
    });
    openClawHook = { ran: true, ok: r.ok, detail: r.steps.map((s) => s.step).join(",") };
  }

  const ok = tenantIsolationOk && denyByDefaultOk && minPermissionsOk;
  return {
    ok,
    mode: "synthetic",
    smAuthorized,
    mcpAuthorized,
    mcpProductiveEnabled,
    tenantIsolationOk,
    denyByDefaultOk,
    minPermissionsOk,
    openClawHook,
    auditLogEntries: auditLog.length,
    rollbackFlags: ROLLBACK_FLAGS,
    blockers,
  };
}

/** Evidence writer helper — parent smoke script can persist this markdown to disk. */
export function buildStagingSharedMemoryMcpEvidenceMarkdown(
  result: StagingSharedMemoryMcpDrillResult,
): string {
  const lines: string[] = [
    "# Evidence — Shared Memory + MCP staging synthetic drill",
    "",
    `- mode: ${result.mode}`,
    `- ok: ${result.ok}`,
    `- smAuthorized: ${result.smAuthorized}`,
    `- mcpAuthorized: ${result.mcpAuthorized}`,
    `- mcpProductiveEnabled: ${result.mcpProductiveEnabled} (must stay false outside deliberate staging)`,
    `- tenantIsolationOk: ${result.tenantIsolationOk}`,
    `- denyByDefaultOk: ${result.denyByDefaultOk}`,
    `- minPermissionsOk: ${result.minPermissionsOk}`,
    `- auditLogEntries: ${result.auditLogEntries}`,
    `- openClawHook: ran=${result.openClawHook.ran} ok=${result.openClawHook.ok} detail=${result.openClawHook.detail}`,
    "",
    "## Rollback",
    ...result.rollbackFlags.map((f) => `- ${f}`),
    "",
    "## Blockers",
    result.blockers.length ? result.blockers.map((b) => `- ${b}`).join("\n") : "- none",
    "",
  ];
  return lines.join("\n");
}

export function assertStagingSharedMemoryMcpHarnessIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (isMcpProductiveEnabled()) violations.push("mcp_productive_must_be_off_by_default_in_repo");
  if (SYNTHETIC_RECORDS.some((r) => r.value.toLowerCase().includes("pepito"))) {
    violations.push("synthetic_fixtures_must_never_reference_pepito");
  }
  const roles = Object.keys(MIN_PERMISSIONS) as SmMcpPermissionRole[];
  if (roles.length !== 3) violations.push("expected_3_roles");
  if (minPermissionsForRole("admin").length <= minPermissionsForRole("reader").length) {
    violations.push("admin_must_have_more_permissions_than_reader");
  }
  return { ok: violations.length === 0, violations };
}
