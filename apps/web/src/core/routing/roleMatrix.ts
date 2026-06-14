import { hasMinimumRole } from "@/core/auth/guards";
import { UserRole } from "@/core/auth/types";

export type ModuleKey =
  | "crm"
  | "inbox"
  | "campaigns"
  | "ads"
  | "social"
  | "automations"
  | "os"
  | "billing"
  | "settings"
  | "branding"
  | "voice"
  | "help";
export type Capability = "view" | "create" | "edit" | "delete";

type ModulePolicy = Record<Capability, UserRole>;
type RoleMatrix = Record<ModuleKey, ModulePolicy>;

export const ROLE_MATRIX: RoleMatrix = {
  crm: { view: "member", create: "member", edit: "operator", delete: "admin" },
  inbox: { view: "member", create: "member", edit: "operator", delete: "admin" },
  campaigns: { view: "member", create: "member", edit: "operator", delete: "admin" },
  ads: { view: "member", create: "member", edit: "operator", delete: "admin" },
  social: { view: "member", create: "member", edit: "operator", delete: "admin" },
  automations: { view: "member", create: "operator", edit: "operator", delete: "admin" },
  os: { view: "member", create: "operator", edit: "operator", delete: "admin" },
  /** Operator can read billing; only admin can act (upgrade / checkout flows). */
  billing: { view: "operator", create: "admin", edit: "admin", delete: "super_admin" },
  /** Member read-only; operator+ can change workspace/tenant fields and invites. */
  settings: { view: "member", create: "operator", edit: "operator", delete: "admin" },
  /** Workspace brand fields (logo, accent) for client-facing surfaces — v1 record only. */
  branding: { view: "member", create: "operator", edit: "operator", delete: "admin" },
  /** Voice readiness surface — v1 is read/plan gated; operator+ for future controls when telephony exists. */
  voice: { view: "member", create: "operator", edit: "operator", delete: "admin" },
  /** Help center is readable to all authenticated roles. */
  help: { view: "member", create: "member", edit: "operator", delete: "admin" },
};

export function can(userRole: UserRole, module: ModuleKey, capability: Capability) {
  return hasMinimumRole(userRole, ROLE_MATRIX[module][capability]);
}
