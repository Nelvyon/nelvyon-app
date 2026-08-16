/** SaaS tenant roles (in-tenant, distinct from workspace UI roleMatrix). */
export type SaasRole = "owner" | "admin" | "operator" | "member" | "viewer";

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
  | "invoices.read"
  | "affiliates.read"
  | "affiliates.write"
  | "loyalty.read"
  | "loyalty.write"
  // SSO (Enterprise) — owner/admin manage, only owner can enforce
  | "sso.read"
  | "sso.write"
  // Audit — owner/admin can read logs and export CSV
  | "audit.read"
  // Settings write — owner only: SSO enforce, retention policy
  | "settings.write";

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
    "affiliates.read",
    "affiliates.write",
    "loyalty.read",
    "loyalty.write",
    "sso.read",
    "sso.write",
    "audit.read",
    "settings.write",
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
    "affiliates.read",
    "affiliates.write",
    "loyalty.read",
    "loyalty.write",
    "sso.read",
    "sso.write",
    "audit.read",
  ],
  /**
   * `operator` — autoridad de TRABAJO, no de plataforma.
   *
   * Existia en el modelo de workspace (`WORKSPACE_MUTATION_ROLES = owner,
   * admin, operator` en `backend/core/rbac.py`) pero no aqui: el mapeo lo
   * colapsaba en `member`, asi que la capa de capabilities le concedia menos de
   * lo que el upstream ya le permitia. No era una restriccion deliberada; era
   * una divergencia.
   *
   * El conjunto NO se inventa: se deriva de lo ya certificado.
   *
   *   parte de `member`            todo lo que member tenia se conserva
   *   + mutaciones de trabajo      campanias.write/launch, workflows.write/
   *                                execute, reports.generate, affiliates.write,
   *                                loyalty.write
   *   - los borrados               contacts/deals/campanias/workflows .delete
   *                                los reserva la matriz a `admin`
   *   - autoridad de plataforma    billing.read, sso.write, audit.read y
   *                                settings.write son de admin/owner
   *
   * Coincide exactamente con `roleMatrix.ts` —automations create/edit a
   * operator, delete a admin; ecommerce edit a operator, delete a admin— y con
   * las dependencias de FastAPI, que son la autoridad real.
   */
  operator: [
    "contacts.read",
    "contacts.write",
    "deals.read",
    "deals.write",
    "campanias.read",
    "campanias.write",
    "campanias.launch",
    "workflows.read",
    "workflows.write",
    "workflows.execute",
    "settings.read",
    "reports.generate",
    "analytics.read",
    "notifications.read",
    "notifications.write",
    "profile.read",
    "profile.write",
    "invoices.read",
    "affiliates.read",
    "affiliates.write",
    "loyalty.read",
    "loyalty.write",
    "sso.read",
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
    "affiliates.read",
    "loyalty.read",
    "sso.read",
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
    "sso.read",
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
  // `operator` deja de colapsarse en `member`.
  //
  // El colapso concedia a los operator MENOS de lo que el upstream ya les
  // permite: `require_workspace_operator` los deja mutar, y la capa de
  // capabilities decia que no. Eso no protegia nada — la autoridad real esta en
  // el upstream— pero hacia imposible declarar capabilities fieles y dejaba a
  // la interfaz mostrando un permiso distinto del que se aplicaba.
  if (r === "operator") return "operator";
  if (r === "member") return "member";
  if (r === "viewer") return "viewer";
  return "viewer";
}

export function listPermissionsForRole(role: SaasRole): SaasAction[] {
  return [...ROLE_PERMISSIONS[role]];
}
