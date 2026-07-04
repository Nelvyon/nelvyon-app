import type { SensitiveActionType } from "./types";

/** Actions that must never auto-execute — always queue for human approval. */
export const GLOBAL_SENSITIVE_ACTIONS: readonly SensitiveActionType[] = [
  "delete_data",
  "send_mass_campaign",
  "touch_production",
  "modify_billing",
  "send_client_message",
  "change_critical_integration",
  "destructive_code",
  "modify_permissions",
  "cross_tenant_access",
] as const;

export function isSensitiveAction(action: string): action is SensitiveActionType {
  return (GLOBAL_SENSITIVE_ACTIONS as readonly string[]).includes(action);
}

export function requiresApproval(
  action: string | undefined,
  agentApprovalList: SensitiveActionType[],
): boolean {
  if (!action) return false;
  if (!isSensitiveAction(action)) return false;
  return agentApprovalList.includes(action) || GLOBAL_SENSITIVE_ACTIONS.includes(action);
}
