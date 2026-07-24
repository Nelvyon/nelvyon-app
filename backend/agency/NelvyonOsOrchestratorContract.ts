/**
 * NELVYON OS orchestrator + OpenClaw coordination contract (ADR-051).
 * OpenClaw remains OFF by default (NELVYON_OPENCLAW_BRIDGE_ENABLED=0 + Shared Memory OFF).
 * Fail-closed: missing context/permission/evidence → needs_review / BLOCKED.
 */

import {
  isOpenClawRuntimeAuthorized,
  resolveOpenClawRuntimeConfig,
  OPENCLAW_ADAPTER_CONTRACT,
} from "../openclaw/contracts";
import { OS_DELIVERABLE_FLOW } from "./OsProfessionalTeams";

export type OrchestratorBlockReason =
  | "openclaw_off"
  | "missing_tenant"
  | "missing_brief"
  | "missing_evidence"
  | "permission_denied"
  | "qa_failed"
  | "independent_auditor_block"
  | "spend_requires_ceo"
  | "local_model_unavailable";

export type NelvyonOrchestrationPlan = {
  briefId: string;
  workspaceId: number;
  tenantId: string;
  specialistTeamId: string;
  steps: readonly string[];
  idempotencyKey?: string;
  timeoutMs: number;
  maxRetries: number;
  openClawMode: "disabled" | "mock_certified" | "live_ready" | "staging_mock";
  allowSpend: boolean;
  allowCampaignSend: boolean;
};

export type NelvyonOrchestrationDecision = {
  accept: boolean;
  status: "ready" | "needs_review" | "blocked";
  blockReasons: OrchestratorBlockReason[];
  plan: NelvyonOrchestrationPlan | null;
  rollback: string;
};

const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_MAX_RETRIES = 2;

export function isNelvyonOsOrchestratorEnabled(): boolean {
  const v = process.env.NELVYON_ORCHESTRATOR_ENABLED?.trim();
  return v === "1" || v?.toUpperCase() === "ON" || v?.toLowerCase() === "true";
}

/**
 * Build a fail-closed orchestration decision. Does not execute agents.
 * OpenClaw may only coordinate when runtime authorized (CEO + ADR later).
 */
export function planNelvyonOsOrchestration(input: {
  briefId?: string;
  workspaceId?: number;
  tenantId?: string;
  specialistTeamId: string;
  idempotencyKey?: string;
  allowSpend?: boolean;
  allowCampaignSend?: boolean;
  evidencePresent?: boolean;
}): NelvyonOrchestrationDecision {
  const blockReasons: OrchestratorBlockReason[] = [];
  const oc = resolveOpenClawRuntimeConfig();

  if (!input.briefId?.trim()) blockReasons.push("missing_brief");
  if (!input.workspaceId || input.workspaceId <= 0) blockReasons.push("missing_tenant");
  if (!input.tenantId?.trim()) blockReasons.push("missing_tenant");
  if (input.evidencePresent === false) blockReasons.push("missing_evidence");
  if (input.allowSpend) blockReasons.push("spend_requires_ceo");
  if (input.allowCampaignSend) blockReasons.push("permission_denied");
  if (!oc.authorized) blockReasons.push("openclaw_off");

  const plan: NelvyonOrchestrationPlan | null =
    input.briefId && input.workspaceId && input.tenantId
      ? {
          briefId: input.briefId,
          workspaceId: input.workspaceId,
          tenantId: input.tenantId,
          specialistTeamId: input.specialistTeamId,
          steps: OS_DELIVERABLE_FLOW,
          idempotencyKey: input.idempotencyKey,
          timeoutMs: DEFAULT_TIMEOUT_MS,
          maxRetries: DEFAULT_MAX_RETRIES,
          openClawMode: oc.mode,
          allowSpend: false,
          allowCampaignSend: false,
        }
      : null;

  // Coordination via OpenClaw is never auto-accepted while OFF.
  if (!isOpenClawRuntimeAuthorized()) {
    return {
      accept: false,
      status: "blocked",
      blockReasons: [...new Set(["openclaw_off" as const, ...blockReasons])],
      plan,
      rollback: OPENCLAW_ADAPTER_CONTRACT.rollback,
    };
  }

  const accept = blockReasons.length === 0 && plan != null;
  return {
    accept,
    status: accept ? "ready" : "needs_review",
    blockReasons: [...new Set(blockReasons)],
    plan,
    rollback: OPENCLAW_ADAPTER_CONTRACT.rollback,
  };
}

export type OpenClawCoordinationRules = {
  decomposeBrief: true;
  assignSpecialistTeam: true;
  respectTenantIsolation: true;
  idempotencyRequired: true;
  noSelfApprove: true;
  requireQaAndIndependentAuditor: true;
  failClosedOnMissingContext: true;
  defaultOff: true;
  featureFlags: string[];
};

export const OPENCLAW_COORDINATION_RULES: OpenClawCoordinationRules = {
  decomposeBrief: true,
  assignSpecialistTeam: true,
  respectTenantIsolation: true,
  idempotencyRequired: true,
  noSelfApprove: true,
  requireQaAndIndependentAuditor: true,
  failClosedOnMissingContext: true,
  defaultOff: true,
  featureFlags: [
    "NELVYON_OPENCLAW_BRIDGE_ENABLED",
    "NELVYON_OPENCLAW_STAGING_MODE",
    "NELVYON_SHARED_MEMORY_ENABLED",
    "NELVYON_ORCHESTRATOR_ENABLED",
    "NELVYON_PACK_INDEPENDENT_AUDITOR",
  ],
};
