/**
 * OpenClaw integration contracts.
 * Runtime: HttpOpenClawBridge when authorized (Memory ON + flag + URL); else Disabled.
 */

export const OPENCLAW_CONTRACT_VERSION = "1.0.0";

export type OpenClawIsolationMode = "off" | "sandbox" | "tenant_bridged";

export type OpenClawCapability =
  | "agent.dispatch"
  | "tool.proxy"
  | "event.subscribe"
  | "memory.read_proxy"
  | "memory.write_proxy";

export type OpenClawSecurityPolicy = {
  privateModeRequired: boolean;
  allowPublicEgress: boolean;
  requireTenantId: boolean;
  requireHumanApprovalFor: string[];
  forbiddenTools: string[];
  maxPayloadBytes: number;
};

export type OpenClawAdapterContract = {
  version: string;
  isolation: OpenClawIsolationMode;
  capabilities: OpenClawCapability[];
  security: OpenClawSecurityPolicy;
  rollback: string;
  featureFlag: string;
};

export const OPENCLAW_ADAPTER_CONTRACT: OpenClawAdapterContract = {
  version: OPENCLAW_CONTRACT_VERSION,
  isolation: "off",
  capabilities: ["agent.dispatch", "tool.proxy", "event.subscribe"],
  security: {
    privateModeRequired: true,
    allowPublicEgress: false,
    requireTenantId: true,
    requireHumanApprovalFor: [
      "send_mass_campaign",
      "delete_data",
      "deploy_production",
      "modify_billing",
      "touch_production",
    ],
    forbiddenTools: ["docker_host_exec", "rotate_credentials", "charge_payment"],
    maxPayloadBytes: 256_000,
  },
  rollback: "NELVYON_OPENCLAW_BRIDGE_ENABLED=0 — DisabledOpenClawBridge only",
  featureFlag: "NELVYON_OPENCLAW_BRIDGE_ENABLED",
};

export function isOpenClawRuntimeAuthorized(): boolean {
  // Hard prerequisites: explicit flag + Shared Memory runtime (ADR-017 order).
  const flag =
    (process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED ?? "0") === "1" ||
    (process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED ?? "").toLowerCase() === "true";
  if (!flag) return false;
  const mem =
    (process.env.NELVYON_SHARED_MEMORY_ENABLED ?? "0") === "1" ||
    (process.env.NELVYON_SHARED_MEMORY_ENABLED ?? "").toLowerCase() === "true";
  return mem;
}

export type OpenClawBenchmarkPlan = {
  cases: Array<{ id: string; goal: string; expect: string }>;
  gates: Record<string, string>;
};

export const OPENCLAW_BENCHMARK_PLAN: OpenClawBenchmarkPlan = {
  cases: [
    { id: "disabled_default", goal: "Bridge disabled by default", expect: "status=disabled" },
    { id: "tenant_required", goal: "Reject missing tenantId", expect: "denied" },
    { id: "no_egress", goal: "No public network without auth", expect: "blocked" },
    { id: "approval_sensitive", goal: "Sensitive actions queue approval", expect: "approval_required" },
    { id: "rollback", goal: "Flag off restores Disabled bridge", expect: "disabled" },
  ],
  gates: {
    defaultDisabled: "100%",
    tenantIsolation: "100%",
    secretLeaks: "0",
    unauthorizedDispatch: "0",
  },
};
