import { UserRole } from "@/core/auth/types";
import { Capability, ModuleKey, can } from "@/core/routing/roleMatrix";

export function canViewScreen(role: UserRole, module: ModuleKey) {
  return can(role, module, "view");
}

export function canPerformAction(role: UserRole, module: ModuleKey, capability: Capability) {
  return can(role, module, capability);
}
