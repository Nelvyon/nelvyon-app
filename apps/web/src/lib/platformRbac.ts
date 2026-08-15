/**
 * RBAC del plano `/api/platform/*`.
 *
 * POR QUÉ EXISTE ESTE FICHERO
 * --------------------------
 * El plano `platform/*` nació como BFF y durante mucho tiempo autorizó con
 * `requirePlatformClaims` + `assertUserCanAccessWorkspace`, es decir:
 * autenticación + PERTENENCIA. El rol de `workspace_members` nunca se leía, así
 * que cualquier miembro activo podía ejecutar operaciones financieras y de
 * integración. Este módulo introduce la capa que faltaba.
 *
 * Es deliberadamente independiente de `backend/saas/saasRbac.ts`: aquel plano
 * tiene su propio vocabulario de acciones sobre otras tablas. Copiar su enum
 * habría mezclado dos dominios que no significan lo mismo.
 *
 * No se apoya en RLS: el runtime Node conecta con un rol `service_role` que
 * bypassa RLS de forma intencionada y documentada. La única frontera real es
 * esta comprobación más el binding SQL de cada store.
 */

export type PlatformAction =
  /** CRM y campañas del workspace: trabajo comercial diario. */
  | "platform.crm.write"
  /** Tickets de soporte. */
  | "platform.support.write"
  /** Configurar precios de reventa a un cliente del partner. */
  | "partners.billing.manage"
  /** Iniciar un cobro real contra el cliente del partner. */
  | "partners.billing.charge"
  /** Invitar a un tercero al portal de cliente. */
  | "partners.portal.invite"
  /** Vincular la cuenta Stripe Connect que recibe el dinero. */
  | "partners.connect.manage"
  /** Conectar la integración de reputación. */
  | "platform.reputation.manage";

/** Roles que `mapWorkspaceRoleToSaas` reconoce y que `workspace_members` puede contener. */
export type PlatformRole = "owner" | "admin" | "member" | "viewer";

/**
 * Matriz rol → capabilities.
 *
 * `partners.billing.charge` y `partners.connect.manage` son owner-only a
 * propósito, y NO se agrupan con `partners.billing.manage`: configurar un precio
 * y mover dinero son autoridades distintas, igual que vincular la cuenta
 * bancaria que cobra. Una capability que significase las tres cambiaría de
 * significado según la ruta.
 */
const ROLE_CAPABILITIES: Record<PlatformRole, readonly PlatformAction[]> = {
  owner: [
    "platform.crm.write",
    "platform.support.write",
    "partners.billing.manage",
    "partners.billing.charge",
    "partners.portal.invite",
    "partners.connect.manage",
    "platform.reputation.manage",
  ],
  admin: [
    "platform.crm.write",
    "platform.support.write",
    "partners.billing.manage",
    "partners.portal.invite",
    "platform.reputation.manage",
  ],
  member: ["platform.crm.write", "platform.support.write"],
  viewer: ["platform.support.write"],
};

/**
 * Normaliza el valor crudo de `workspace_members.role`.
 *
 * La columna es `VARCHAR NOT NULL` SIN CHECK ni enum, así que puede contener
 * cualquier cadena. Devuelve `null` ante cualquier valor no reconocido: en este
 * plano un rol desconocido NO se degrada a `member` ni a `viewer`, se queda sin
 * ninguna capability. Degradar en silencio es como se conceden privilegios por
 * accidente.
 */
export function normalizePlatformRole(raw: string | null | undefined): PlatformRole | null {
  const r = (raw ?? "").trim().toLowerCase();
  if (r === "owner") return "owner";
  if (r === "admin") return "admin";
  // `operator` es el nombre heredado de `member` en workspaces antiguos.
  if (r === "member" || r === "operator") return "member";
  if (r === "viewer") return "viewer";
  return null;
}

/** Capabilities efectivas. Un rol no reconocido no tiene ninguna. */
export function platformCapabilitiesFor(role: PlatformRole | null): readonly PlatformAction[] {
  if (!role) return [];
  return ROLE_CAPABILITIES[role];
}

export function canPlatformPerform(role: PlatformRole | null, action: PlatformAction): boolean {
  return platformCapabilitiesFor(role).includes(action);
}
