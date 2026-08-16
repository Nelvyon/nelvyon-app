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
  | "platform.reputation.manage"
  /** Ver reglas y flujos de automatización. */
  | "platform.automations.read"
  /** Crear o editar una automatización. La matriz de producto la abre a `operator`. */
  | "platform.automations.write"
  /** Borrar una automatización. La matriz la reserva a `admin`. */
  | "platform.automations.delete"
  /** Ver proyectos y productos de la tienda. */
  | "platform.ecommerce.read"
  /** Crear un proyecto o un producto. La matriz la abre a `member`, y esa política se conserva. */
  | "platform.ecommerce.create"
  /** Editar la tienda: generar, publicar, descuentos y actualizar producto. `operator`. */
  | "platform.ecommerce.edit"
  /** Borrar proyecto o producto. La matriz la reserva a `admin`. */
  | "platform.ecommerce.delete";

/** Roles que `workspace_members` puede contener. Los cinco de `core/rbac.py`. */
export type PlatformRole = "owner" | "admin" | "operator" | "member" | "viewer";

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
    "platform.automations.read",
    "platform.automations.write",
    "platform.automations.delete",
    "platform.ecommerce.read",
    "platform.ecommerce.create",
    "platform.ecommerce.edit",
    "platform.ecommerce.delete",
  ],
  admin: [
    "platform.crm.write",
    "platform.support.write",
    "partners.billing.manage",
    "partners.portal.invite",
    "platform.reputation.manage",
    "platform.automations.read",
    "platform.automations.write",
    "platform.automations.delete",
    "platform.ecommerce.read",
    "platform.ecommerce.create",
    "platform.ecommerce.edit",
    "platform.ecommerce.delete",
  ],
  /**
   * `operator` — autoridad de trabajo, sin borrado ni plataforma.
   *
   * Antes se colapsaba en `member`, asi que la interfaz le mostraba menos de lo
   * que el upstream ya le concedia: `require_workspace_operator` le deja mutar.
   * La divergencia no protegia nada y hacia imposible declarar capabilities
   * fieles.
   *
   * Las capabilities salen de `roleMatrix.ts`, no de una decision nueva:
   * automations create/edit a operator y delete a admin; ecommerce edit a
   * operator y delete a admin.
   */
  operator: [
    "platform.crm.write",
    "platform.support.write",
    "platform.automations.read",
    "platform.automations.write",
    "platform.ecommerce.read",
    "platform.ecommerce.create",
    "platform.ecommerce.edit",
  ],
  /**
   * `member` conserva EXACTAMENTE lo que tenia, mas las lecturas y el `create`
   * de ecommerce que la matriz ya le reconoce. No se le retira nada: la
   * politica vigente le permite crear proyectos y productos.
   */
  member: [
    "platform.crm.write",
    "platform.support.write",
    "platform.automations.read",
    "platform.ecommerce.read",
    "platform.ecommerce.create",
  ],
  /**
   * `viewer` conserva EXACTAMENTE lo que tenia.
   *
   * No recibe las lecturas nuevas: `roleMatrix.ts` fija `automations.view` y
   * `ecommerce.view` en `member`, y la certificacion de produccion comprobo que
   * un viewer recibe 403 en la tienda. Concederselas aqui habria sido ampliar
   * privilegios por el camino de «parece razonable que pueda ver».
   */
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
  // `operator` es un rol propio, no un alias de `member`. Ver ROLE_CAPABILITIES.
  if (r === "operator") return "operator";
  if (r === "member") return "member";
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
