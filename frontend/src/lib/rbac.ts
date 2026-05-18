/**
 * RBAC — Role-Based Access Control for NELVYON.
 *
 * Roles (ordered by privilege):
 *   super_admin > admin > manager > user > viewer
 *
 * Each role has a set of permissions. Higher roles inherit all
 * permissions from lower roles.
 */

export type Role = "super_admin" | "admin" | "manager" | "user" | "viewer";

export type Permission =
  // Clients
  | "clients:read" | "clients:create" | "clients:update" | "clients:delete"
  // Projects
  | "projects:read" | "projects:create" | "projects:update" | "projects:delete"
  // Outputs & AI generation
  | "outputs:read" | "outputs:create" | "outputs:generate" | "outputs:delete"
  // Campaigns
  | "campaigns:read" | "campaigns:create" | "campaigns:update" | "campaigns:delete"
  // Contacts / CRM
  | "contacts:read" | "contacts:create" | "contacts:update" | "contacts:delete"
  // Funnels
  | "funnels:read" | "funnels:create" | "funnels:update" | "funnels:delete"
  // Workflows / Automations
  | "workflows:read" | "workflows:create" | "workflows:update" | "workflows:delete"
  // Blog
  | "blog:read" | "blog:create" | "blog:update" | "blog:delete"
  // Calendar
  | "calendar:read" | "calendar:create" | "calendar:update" | "calendar:delete"
  // Helpdesk
  | "helpdesk:read" | "helpdesk:create" | "helpdesk:update" | "helpdesk:resolve"
  // Billing & Payments
  | "billing:read" | "billing:manage"
  // Platform Health & Metrics
  | "platform:health" | "platform:metrics" | "platform:settings"
  // Agents
  | "agents:read" | "agents:create" | "agents:update" | "agents:delete" | "agents:configure"
  // Templates & Global Config
  | "templates:read" | "templates:create" | "templates:update" | "templates:delete"
  // User Management
  | "users:read" | "users:invite" | "users:manage_roles" | "users:delete"
  // Partners
  | "partners:read" | "partners:manage"
  // Reports
  | "reports:read" | "reports:create" | "reports:export"
  // Security
  | "security:read" | "security:manage"
  // Presentations & PDF
  | "presentations:read" | "presentations:create"
  // Segmentation
  | "segmentation:read" | "segmentation:create"
  // Sales
  | "sales:read" | "sales:create" | "sales:update"
  // Integrations
  | "integrations:read" | "integrations:manage";

/** Permissions for each role. Higher roles inherit lower ones via ROLE_HIERARCHY. */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: [
    "clients:read", "projects:read", "outputs:read", "campaigns:read",
    "contacts:read", "funnels:read", "workflows:read", "blog:read",
    "calendar:read", "helpdesk:read", "agents:read", "templates:read",
    "reports:read", "partners:read", "presentations:read", "segmentation:read",
    "sales:read", "integrations:read", "security:read",
  ],
  user: [
    "clients:create", "clients:update",
    "projects:create", "projects:update",
    "outputs:create", "outputs:generate",
    "campaigns:create", "campaigns:update",
    "contacts:create", "contacts:update",
    "funnels:create", "funnels:update",
    "workflows:create", "workflows:update",
    "blog:create", "blog:update",
    "calendar:create", "calendar:update",
    "helpdesk:create", "helpdesk:update",
    "presentations:create", "segmentation:create",
    "sales:create", "sales:update",
    "reports:create", "reports:export",
  ],
  manager: [
    "clients:delete", "projects:delete", "outputs:delete",
    "campaigns:delete", "contacts:delete", "funnels:delete",
    "workflows:delete", "blog:delete", "calendar:delete",
    "helpdesk:resolve",
    "billing:read",
    "agents:create", "agents:update",
    "templates:create", "templates:update",
    "users:read", "users:invite",
    "partners:manage",
  ],
  admin: [
    "billing:manage",
    "platform:health", "platform:metrics",
    "agents:delete", "agents:configure",
    "templates:delete",
    "users:manage_roles",
    "security:manage",
    "integrations:manage",
  ],
  super_admin: [
    "platform:settings",
    "users:delete",
  ],
};

/** Role hierarchy — index 0 is highest privilege */
const ROLE_HIERARCHY: Role[] = ["super_admin", "admin", "manager", "user", "viewer"];

/** Get the numeric level of a role (lower = more privileged) */
export function getRoleLevel(role: Role): number {
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx >= 0 ? idx : ROLE_HIERARCHY.length;
}

/** Check if roleA is equal or higher privilege than roleB */
export function isRoleAtLeast(roleA: Role, roleB: Role): boolean {
  return getRoleLevel(roleA) <= getRoleLevel(roleB);
}

/** Get all permissions for a role (including inherited from lower roles) */
export function getPermissionsForRole(role: Role): Set<Permission> {
  const perms = new Set<Permission>();
  const level = getRoleLevel(role);

  // Collect permissions from this role and all lower roles
  for (let i = ROLE_HIERARCHY.length - 1; i >= level; i--) {
    const r = ROLE_HIERARCHY[i];
    ROLE_PERMISSIONS[r].forEach((p) => perms.add(p));
  }

  return perms;
}

/** Check if a role has a specific permission */
export function hasPermission(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).has(permission);
}

/** Check if a role has ALL of the specified permissions */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  const perms = getPermissionsForRole(role);
  return permissions.every((p) => perms.has(p));
}

/** Check if a role has ANY of the specified permissions */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  const perms = getPermissionsForRole(role);
  return permissions.some((p) => perms.has(p));
}

/** Get human-readable label for a role */
export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    super_admin: "Super Admin",
    admin: "Administrador",
    manager: "Manager",
    user: "Usuario",
    viewer: "Solo Lectura",
  };
  return labels[role] || role;
}

/** Get color for a role badge */
export function getRoleColor(role: Role): string {
  const colors: Record<Role, string> = {
    super_admin: "text-red-400 bg-red-500/10 border-red-500/20",
    admin: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    manager: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    user: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    viewer: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  };
  return colors[role] || "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
}

/** All available roles for dropdowns */
export const ALL_ROLES: Role[] = [...ROLE_HIERARCHY];

/** Default role for new users */
export const DEFAULT_ROLE: Role = "user";

/** Permission categories for admin UI */
export const PERMISSION_CATEGORIES = [
  { label: "Clientes", permissions: ["clients:read", "clients:create", "clients:update", "clients:delete"] as Permission[] },
  { label: "Proyectos", permissions: ["projects:read", "projects:create", "projects:update", "projects:delete"] as Permission[] },
  { label: "Outputs & IA", permissions: ["outputs:read", "outputs:create", "outputs:generate", "outputs:delete"] as Permission[] },
  { label: "Campañas", permissions: ["campaigns:read", "campaigns:create", "campaigns:update", "campaigns:delete"] as Permission[] },
  { label: "CRM / Contactos", permissions: ["contacts:read", "contacts:create", "contacts:update", "contacts:delete"] as Permission[] },
  { label: "Funnels", permissions: ["funnels:read", "funnels:create", "funnels:update", "funnels:delete"] as Permission[] },
  { label: "Automatizaciones", permissions: ["workflows:read", "workflows:create", "workflows:update", "workflows:delete"] as Permission[] },
  { label: "Blog", permissions: ["blog:read", "blog:create", "blog:update", "blog:delete"] as Permission[] },
  { label: "Facturación", permissions: ["billing:read", "billing:manage"] as Permission[] },
  { label: "Plataforma", permissions: ["platform:health", "platform:metrics", "platform:settings"] as Permission[] },
  { label: "Agentes", permissions: ["agents:read", "agents:create", "agents:update", "agents:delete", "agents:configure"] as Permission[] },
  { label: "Usuarios", permissions: ["users:read", "users:invite", "users:manage_roles", "users:delete"] as Permission[] },
  { label: "Seguridad", permissions: ["security:read", "security:manage"] as Permission[] },
  { label: "Integraciones", permissions: ["integrations:read", "integrations:manage"] as Permission[] },
] as const;