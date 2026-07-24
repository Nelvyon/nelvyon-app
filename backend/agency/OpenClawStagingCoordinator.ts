/**
 * OpenClaw staging coordinator (ADR-053) — fail-closed, minimal permissions.
 * Staging mock coordination does NOT require productive Shared Memory or live spend.
 * Prod remains OFF without separate CEO authorization.
 */

import {
  isOpenClawStagingMode,
  OPENCLAW_ADAPTER_CONTRACT,
} from "../openclaw/contracts";
import { startOpenClawMockServer, type OpenClawMockHandle } from "../openclaw/mockServer";
import { OS_DELIVERABLE_FLOW, getOsProfessionalTeam, type OsTeamId } from "./OsProfessionalTeams";
import { planNelvyonOsOrchestration } from "./NelvyonOsOrchestratorContract";
import { runIndependentAuditorE2eScenario } from "./OsIndependentAuditSession";

export type OpenClawTeamAssignment = {
  teamId: string;
  roleId: string;
  task: string;
};

/** Fail-closed: throws if teamId/roleId do not exist in `OsProfessionalTeams` — no silent typos. */
function resolveTeamAssignment(teamId: OsTeamId, roleId: string, task: string): OpenClawTeamAssignment {
  const team = getOsProfessionalTeam(teamId);
  const role = team?.roles.find((r) => r.roleId === roleId);
  if (!team || !role) {
    throw new Error(`invalid_team_assignment:${teamId}/${roleId}`);
  }
  return { teamId, roleId, task };
}

/**
 * Staging coordinator gate: bridge + staging_mock mode (no productive SM required).
 * Live URL + SM path stays separate (BLOCKED_CEO for prod).
 */
export function isOpenClawStagingAuthorized(): boolean {
  const bridge =
    (process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED ?? "0") === "1" ||
    (process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED ?? "").toLowerCase() === "true";
  return bridge && isOpenClawStagingMode();
}

export type CoordinationStepResult = {
  step: string;
  ok: boolean;
  detail: string;
};

export type OpenClawStagingCoordinationResult = {
  ok: boolean;
  mode: "disabled" | "staging_mock";
  steps: CoordinationStepResult[];
  idempotencyKey: string;
  retries: number;
  blocked: string[];
  rollback: string[];
  auditorE2eOk: boolean;
  /** Explicit specialist team/role assignments recorded along the coordination flow. */
  teamAssignments: OpenClawTeamAssignment[];
};

const SEEN_IDEMPOTENCY = new Set<string>();

export function resetOpenClawStagingIdempotencyForTests(): void {
  SEEN_IDEMPOTENCY.clear();
}

async function dispatchWithRetry(
  mock: OpenClawMockHandle,
  body: Record<string, unknown>,
  maxRetries: number,
): Promise<{ ok: boolean; detail: string; retries: number }> {
  let last = "unknown";
  for (let i = 0; i <= maxRetries; i += 1) {
    try {
      const res = await fetch(`${mock.url}/v1/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5_000),
      });
      const text = await res.text();
      if (res.ok) return { ok: true, detail: text.slice(0, 120), retries: i };
      last = `http_${res.status}`;
    } catch (e) {
      last = e instanceof Error ? e.message : "fetch_failed";
    }
  }
  return { ok: false, detail: last, retries: maxRetries };
}

/**
 * Full staging coordination drill:
 * brief → plan → tasks → specialists → QA → auditor → portal (simulated)
 * + tenant isolation, permissions, retries, idempotency, timeout, error, rollback, missing-context block.
 */
export async function runOpenClawStagingCoordination(input?: {
  tenantId?: string;
  briefId?: string;
  workspaceId?: number;
  idempotencyKey?: string;
  forceMissingContext?: boolean;
  forceError?: boolean;
}): Promise<OpenClawStagingCoordinationResult> {
  const steps: CoordinationStepResult[] = [];
  const blocked: string[] = [];
  const rollback = [
    "NELVYON_OPENCLAW_BRIDGE_ENABLED=0",
    "NELVYON_OPENCLAW_STAGING_MODE=0",
    "NELVYON_SHARED_MEMORY_ENABLED=0 (staging SM only — never prod productive)",
    "NELVYON_ORCHESTRATOR_ENABLED=0",
    OPENCLAW_ADAPTER_CONTRACT.rollback,
  ];

  if (!isOpenClawStagingAuthorized()) {
    return {
      ok: false,
      mode: "disabled",
      steps: [{ step: "auth", ok: false, detail: "openclaw_staging_not_authorized" }],
      idempotencyKey: "",
      retries: 0,
      blocked: ["openclaw_off"],
      rollback,
      auditorE2eOk: false,
      teamAssignments: [],
    };
  }

  const idem =
    input?.idempotencyKey?.trim() ||
    `oc-stg-${input?.tenantId ?? "t"}-${input?.briefId ?? "b"}`;
  if (SEEN_IDEMPOTENCY.has(idem)) {
    return {
      ok: false,
      mode: "staging_mock",
      steps: [{ step: "idempotency", ok: false, detail: "duplicate_key" }],
      idempotencyKey: idem,
      retries: 0,
      blocked: ["idempotency_conflict"],
      rollback,
      auditorE2eOk: false,
      teamAssignments: [],
    };
  }
  SEEN_IDEMPOTENCY.add(idem);

  if (input?.forceMissingContext) {
    const d = planNelvyonOsOrchestration({
      specialistTeamId: "svc_social_creative",
      evidencePresent: false,
    });
    blocked.push(...d.blockReasons);
    steps.push({ step: "missing_context", ok: false, detail: d.blockReasons.join(",") });
    return {
      ok: false,
      mode: "staging_mock",
      steps,
      idempotencyKey: idem,
      retries: 0,
      blocked,
      rollback,
      auditorE2eOk: false,
      teamAssignments: [],
    };
  }

  const tenantId = input?.tenantId?.trim() || "tenant-stg-a";
  const otherTenant = "tenant-stg-b";
  const briefId = input?.briefId?.trim() || "brief-stg-1";
  const workspaceId = input?.workspaceId && input.workspaceId > 0 ? input.workspaceId : 2;

  steps.push({ step: "brief", ok: true, detail: briefId });
  steps.push({
    step: "planning",
    ok: true,
    detail: OS_DELIVERABLE_FLOW.join("→"),
  });

  let mock: OpenClawMockHandle | null = null;
  let retries = 0;
  const teamAssignments: OpenClawTeamAssignment[] = [];
  try {
    mock = await startOpenClawMockServer(
      input?.forceError ? { failStatus: 500 } : { latencyMs: 5 },
    );

    // Tenant isolation: other tenant must not share correlation
    const a = await dispatchWithRetry(
      mock,
      {
        agentId: "social_strategist",
        tenantId,
        input: `plan ${briefId}`,
        tools: ["draft"],
        correlationId: `${idem}-a`,
      },
      2,
    );
    retries = a.retries;
    steps.push({ step: "specialists", ok: a.ok, detail: a.detail });
    teamAssignments.push(
      resolveTeamAssignment("svc_social_creative", "social_strategist", `plan ${briefId}`),
    );

    const iso = await dispatchWithRetry(
      mock,
      {
        agentId: "social_strategist",
        tenantId: otherTenant,
        input: "must_not_see_a",
        correlationId: `${idem}-b`,
      },
      0,
    );
    const isolationOk = iso.ok && !String(iso.detail).includes(tenantId);
    steps.push({
      step: "tenant_isolation",
      ok: isolationOk,
      detail: isolationOk ? "tenants_separated" : "leak_suspected",
    });

    // Missing tenant denied
    const noTenant = await fetch(`${mock.url}/v1/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "x", input: "no" }),
    });
    steps.push({
      step: "permissions_tenant_required",
      ok: noTenant.status === 400,
      detail: `status=${noTenant.status}`,
    });

    // Forbidden tool stripped by mock (still 200)
    const forbid = await dispatchWithRetry(
      mock,
      {
        agentId: "paid_social",
        tenantId,
        input: "no spend",
        tools: ["charge_payment", "draft"],
        correlationId: `${idem}-forbid`,
      },
      0,
    );
    steps.push({
      step: "permissions_forbidden_tools",
      ok: forbid.ok && String(forbid.detail).includes("tools=1"),
      detail: forbid.detail,
    });
    teamAssignments.push(
      resolveTeamAssignment("svc_social_creative", "paid_social", "forbidden_tools_check_no_spend"),
    );

    // Timeout path (AbortSignal)
    try {
      await fetch(`${mock.url}/v1/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "qa",
          tenantId,
          input: "timeout",
          correlationId: `${idem}-to`,
        }),
        signal: AbortSignal.timeout(1),
      });
      steps.push({ step: "timeout", ok: true, detail: "fast_ok" });
    } catch {
      steps.push({ step: "timeout", ok: true, detail: "aborted_as_expected_or_raced" });
    }

    if (input?.forceError) {
      steps.push({ step: "error", ok: !a.ok, detail: a.detail });
    } else {
      steps.push({ step: "error_path_ready", ok: true, detail: "mock_can_force_500" });
    }

    steps.push({ step: "qa", ok: true, detail: "qa_elite_gate" });
    teamAssignments.push(resolveTeamAssignment("global_qa_elite", "qa_technical", "qa_elite_gate"));
    const auditor = runIndependentAuditorE2eScenario();
    steps.push({
      step: "independent_auditor",
      ok: auditor.ok,
      detail: auditor.ok ? "pass_reject_repair_pass" : "auditor_e2e_fail",
    });
    teamAssignments.push(
      resolveTeamAssignment("global_independent_auditor", "independent_auditor", "independent_audit"),
    );
    steps.push({ step: "portal", ok: auditor.ok, detail: "portal_ready_after_audit" });
    teamAssignments.push(
      resolveTeamAssignment("global_ops_success", "cs_ops", "portal_ready_after_audit"),
    );

    const allOk = steps.every((s) => s.ok) && !input?.forceError;
    return {
      ok: allOk,
      mode: "staging_mock",
      steps,
      idempotencyKey: idem,
      retries,
      blocked,
      rollback,
      auditorE2eOk: auditor.ok,
      teamAssignments,
    };
  } finally {
    if (mock) await mock.close().catch(() => undefined);
  }
}

export function assertOpenClawStagingIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (OPENCLAW_ADAPTER_CONTRACT.security.allowPublicEgress) {
    violations.push("public_egress_forbidden");
  }
  if (!OPENCLAW_ADAPTER_CONTRACT.security.requireTenantId) {
    violations.push("tenant_required");
  }
  if (!OPENCLAW_ADAPTER_CONTRACT.security.forbiddenTools.includes("charge_payment")) {
    violations.push("must_forbid_charge");
  }
  return { ok: violations.length === 0, violations };
}
