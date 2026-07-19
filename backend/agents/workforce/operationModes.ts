/**
 * Operation modes + emergency stop — ADR-027 / workforce Block B.
 */

import type { OperationMode } from "./hierarchy";

export type ModePolicy = {
  mode: OperationMode;
  mayInvokeTools: boolean;
  mayWriteMemory: boolean;
  mayMutateExternal: boolean;
  requiresApprovalForSensitive: boolean;
  description: string;
};

export const OPERATION_MODE_POLICIES: Record<OperationMode, ModePolicy> = {
  observe: {
    mode: "observe",
    mayInvokeTools: false,
    mayWriteMemory: false,
    mayMutateExternal: false,
    requiresApprovalForSensitive: true,
    description: "Solo análisis; sin tools de escritura ni mutaciones.",
  },
  draft: {
    mode: "draft",
    mayInvokeTools: true,
    mayWriteMemory: false,
    mayMutateExternal: false,
    requiresApprovalForSensitive: true,
    description: "Planes y borradores; tools de lectura; sin mutaciones externas.",
  },
  assisted: {
    mode: "assisted",
    mayInvokeTools: true,
    mayWriteMemory: true,
    mayMutateExternal: false,
    requiresApprovalForSensitive: true,
    description: "Bajo riesgo con STM; acciones sensibles → aprobación.",
  },
  autonomous: {
    mode: "autonomous",
    mayInvokeTools: true,
    mayWriteMemory: true,
    mayMutateExternal: true,
    requiresApprovalForSensitive: true,
    description: "Workflows preautorizados dentro de límites; nunca bypass de permisos.",
  },
  emergency_stop: {
    mode: "emergency_stop",
    mayInvokeTools: false,
    mayWriteMemory: false,
    mayMutateExternal: false,
    requiresApprovalForSensitive: true,
    description: "Detiene nuevas acciones; conserva estado.",
  },
};

/** Forbidden under autonomous even when mode=autonomous */
export const AUTONOMOUS_HARD_DENY = [
  "delete_data",
  "deploy_production",
  "send_mass_campaign",
  "modify_billing",
  "charge_payment",
  "rotate_credentials",
  "cross_tenant_access",
  "arbitrary_shell",
] as const;

let globalMode: OperationMode = "assisted";
let emergencyStop = false;

export function getGlobalOperationMode(): OperationMode {
  if (emergencyStop) return "emergency_stop";
  return globalMode;
}

export function setGlobalOperationMode(mode: OperationMode): void {
  if (mode === "emergency_stop") {
    emergencyStop = true;
    globalMode = "emergency_stop";
    return;
  }
  emergencyStop = false;
  globalMode = mode;
}

export function triggerEmergencyStop(): void {
  emergencyStop = true;
  globalMode = "emergency_stop";
}

export function clearEmergencyStop(resumeMode: OperationMode = "assisted"): void {
  if (resumeMode === "emergency_stop") resumeMode = "assisted";
  emergencyStop = false;
  globalMode = resumeMode;
}

export function isEmergencyStopped(): boolean {
  return emergencyStop;
}

export function assertActionAllowedInMode(
  mode: OperationMode,
  action: string,
): { allowed: boolean; reason?: string } {
  const policy = OPERATION_MODE_POLICIES[mode];
  if (mode === "emergency_stop") {
    return { allowed: false, reason: "emergency_stop" };
  }
  if ((AUTONOMOUS_HARD_DENY as readonly string[]).includes(action)) {
    return { allowed: false, reason: `hard_deny:${action}` };
  }
  if (!policy.mayMutateExternal && ["send_mass_campaign", "deploy_production", "delete_data"].includes(action)) {
    return { allowed: false, reason: "mode_forbids_external_mutate" };
  }
  return { allowed: true };
}

export function resetOperationModeForTests(): void {
  emergencyStop = false;
  globalMode = "assisted";
}
