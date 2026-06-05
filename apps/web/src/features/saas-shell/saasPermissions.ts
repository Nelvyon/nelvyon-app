/** Client-safe SaaS RBAC types (mirrors backend/saas/saasRbac.ts). */
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
  | "reports.generate";

export const SAAS_ROLE_LABELS: Record<SaasRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
  viewer: "Solo lectura",
};

export function saasRoleLabel(role: SaasRole | string): string {
  if (role in SAAS_ROLE_LABELS) return SAAS_ROLE_LABELS[role as SaasRole];
  return role;
}

export function hasSaasPermission(permissions: readonly string[], action: SaasAction): boolean {
  return permissions.includes(action);
}

export function saasForbiddenMessage(action: SaasAction): string {
  const labels: Partial<Record<SaasAction, string>> = {
    "contacts.write": "crear o editar contactos",
    "contacts.delete": "eliminar contactos",
    "deals.write": "crear o editar deals",
    "deals.delete": "eliminar deals",
    "campanias.write": "gestionar campañas",
    "campanias.delete": "eliminar campañas",
    "campanias.launch": "lanzar campañas",
    "workflows.write": "gestionar workflows",
    "workflows.delete": "eliminar workflows",
    "workflows.execute": "ejecutar workflows",
    "billing.read": "ver facturación",
  };
  const label = labels[action] ?? action;
  return `Tu rol no permite ${label}. Contacta con un administrador del tenant si necesitas acceso.`;
}
