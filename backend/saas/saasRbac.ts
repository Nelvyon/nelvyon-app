/** SaaS tenant roles (in-tenant, distinct from workspace UI roleMatrix). */
export type SaasRole = "owner" | "admin" | "member" | "viewer";

export type SaasAction =
  | "contacts.read"
  | "contacts.write"
  | "contacts.delete"
  | "deals.read"
  | "deals.write"
  | "deals.delete"
  | "campanias.read"
  | "campanias.write"
  | "campanias.delete"
  | "campanias.launch"
  | "workflows.read"
  | "workflows.write"
  | "workflows.delete"
  | "workflows.execute"
  | "billing.read"
  | "settings.read"
  | "reports.generate"
  | "analytics.read"
  | "notifications.read"
  | "notifications.write"
  | "profile.read"
  | "profile.write"
  | "invoices.read";

const ROLE_PERMISSIONS: Record<SaasRole, readonly SaasAction[]> = {
  owner: [
    "contacts.read",
    "contacts.write",
    "contacts.delete",
    "deals.read",
    "deals.write",
    "deals.delete",
    "campanias.read",
    "campanias.write",
    "campanias.delete",
    "campanias.launch",
    "workflows.read",
    "workflows.write",
    "workflows.delete",
    "workflows.execute",
    "billing.read",
    "settings.read",
    "reports.generate",
    "analytics.read",
    "notifications.read",
    "notifications.write",
    "profile.read",
    "profile.write",
    "invoices.read",
  ],
  admin: [
    "contacts.read",
    "contacts.write",
    "contacts.delete",
    "deals.read",
    "deals.write",
    "deals.delete",
    "campanias.read",
    "campanias.write",
    "campanias.delete",
    "campanias.launch",
    "workflows.read",
    "workflows.write",
    "workflows.delete",
    "workflows.execute",
    "billing.read",
    "settings.read",
    "reports.generate",
    "analytics.read",
    "notifications.read",
    "notifications.write",
    "profile.read",
    "profile.write",
    "invoices.read",
  ],
  member: [
    "contacts.read",
    "contacts.write",
    "deals.read",
    "deals.write",
    "campanias.read",
    "workflows.read",
    "settings.read",
    "analytics.read",
    "notifications.read",
    "notifications.write",
    "profile.read",
    "profile.write",
    "invoices.read",
  ],
  viewer: [
    "contacts.read",
    "deals.read",
    "campanias.read",
    "workflows.read",
    "settings.read",
    "analytics.read",
    "notifications.read",
    "notifications.write",
    "profile.read",
    "invoices.read",
  ],
};

export class SaasRbacError extends Error {
  constructor(
    message: string,
    public readonly code: "FORBIDDEN" | "NOT_FOUND",
  ) {
    super(message);
    this.name = "SaasRbacError";
  }
}

export function canSaasPerform(role: SaasRole, action: SaasAction): boolean {
  return ROLE_PERMISSIONS[role].includes(action);
}

export function assertSaasPermission(role: SaasRole, action: SaasAction): void {
  if (!canSaasPerform(role, action)) {
    throw new SaasRbacError(`Insufficient permissions for ${action}`, "FORBIDDEN");
  }
}

/** Map legacy workspace_members.role → SaaS role. */
export function mapWorkspaceRoleToSaas(workspaceRole: string): SaasRole {
  const r = workspaceRole.toLowerCase();
  if (r === "owner") return "owner";
  if (r === "admin") return "admin";
  if (r === "operator" || r === "member") return "member";
  if (r === "viewer") return "viewer";
  return "viewer";
}

export function listPermissionsForRole(role: SaasRole): SaasAction[] {
  return [...ROLE_PERMISSIONS[role]];
}
