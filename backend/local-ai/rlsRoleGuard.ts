/**
 * Guardia del rol de PostgreSQL usado por local-ai.
 *
 * POR QUÉ EXISTE
 * --------------
 * El aislamiento entre tenants de RAG y memoria NO lo hace el código: lo hace
 * Row Level Security en PostgreSQL, con políticas sobre `app.tenant_id`.
 *
 * Pero **RLS se salta siempre para superusuarios**, y `FORCE ROW LEVEL
 * SECURITY` no lo impide: `FORCE` cierra el bypass del PROPIETARIO de la tabla,
 * no el del superusuario ni el del rol con `BYPASSRLS`.
 *
 * Esto se comprobó empíricamente contra la base real. Con el rol de aplicación
 * (`NOSUPERUSER NOBYPASSRLS`) el aislamiento es perfecto: el tenant B no ve ni
 * un dato del tenant A. Con el superusuario del contenedor, las MISMAS
 * políticas y las MISMAS tablas dan fuga total: B lee los documentos de A y
 * además puede borrarlos.
 *
 * Es decir: todo el aislamiento depende de una variable de configuración,
 * `LOCAL_AI_DATABASE_URL`. Apuntarla a un rol privilegiado desactiva la
 * protección por completo sin que nada falle ni avise. Este guard convierte ese
 * fallo silencioso en un fallo ruidoso.
 *
 * QUÉ COMPRUEBA
 * -------------
 * Propiedades del rol EFECTIVO, no su nombre. Comparar contra
 * `nelvyon_local_app` sería frágil: el nombre puede cambiar por entorno, y un
 * rol llamado así podría haber recibido `BYPASSRLS` después.
 */

export type RlsRoleCheck = {
  ok: boolean;
  currentUser: string;
  isSuperuser: boolean;
  bypassesRls: boolean;
  reason?: string;
};

/** Cliente mínimo necesario: solo hace falta poder consultar. */
export type RoleProbeClient = {
  query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

const PROBE_SQL = `
  SELECT current_user AS current_user,
         rolsuper     AS rolsuper,
         rolbypassrls AS rolbypassrls
    FROM pg_roles
   WHERE rolname = current_user`;

function asBool(v: unknown): boolean {
  return v === true || v === "t" || v === "true";
}

/**
 * Inspecciona el rol efectivo. Nunca lanza: devuelve el veredicto para que el
 * llamante decida. Un fallo de la propia comprobación se trata como NO ok
 * —fail-closed—: si no podemos demostrar que RLS aplica, no afirmamos que aplica.
 */
export async function checkRlsRole(client: RoleProbeClient): Promise<RlsRoleCheck> {
  let row: Record<string, unknown> | undefined;
  try {
    const result = await client.query(PROBE_SQL);
    row = result.rows[0];
  } catch (err) {
    return {
      ok: false,
      currentUser: "unknown",
      isSuperuser: false,
      bypassesRls: false,
      reason: `No se pudo verificar el rol de PostgreSQL: ${
        err instanceof Error ? err.message : "error desconocido"
      }. No se asume que RLS proteja los tenants.`,
    };
  }

  if (!row) {
    return {
      ok: false,
      currentUser: "unknown",
      isSuperuser: false,
      bypassesRls: false,
      reason:
        "pg_roles no devolvió el rol actual. No se puede demostrar que RLS aplique.",
    };
  }

  const currentUser = String(row.current_user ?? "unknown");
  const isSuperuser = asBool(row.rolsuper);
  const bypassesRls = asBool(row.rolbypassrls);

  if (isSuperuser || bypassesRls) {
    const motivos: string[] = [];
    if (isSuperuser) motivos.push("es SUPERUSER");
    if (bypassesRls) motivos.push("tiene BYPASSRLS");
    return {
      ok: false,
      currentUser,
      isSuperuser,
      bypassesRls,
      reason:
        `El rol "${currentUser}" ${motivos.join(" y ")}, así que PostgreSQL IGNORA ` +
        `Row Level Security para él: el aislamiento entre tenants de RAG y memoria ` +
        `NO está activo. FORCE ROW LEVEL SECURITY no cubre este caso. ` +
        `Apunta LOCAL_AI_DATABASE_URL a un rol NOSUPERUSER NOBYPASSRLS ` +
        `(ver migración 002_local_ai_app_role.sql).`,
    };
  }

  return { ok: true, currentUser, isSuperuser: false, bypassesRls: false };
}

export class RlsRoleUnsafeError extends Error {
  readonly code = "local_ai_rls_role_unsafe";
  constructor(readonly check: RlsRoleCheck) {
    super(check.reason ?? "Rol de PostgreSQL inseguro para RLS");
    this.name = "RlsRoleUnsafeError";
  }
}

/** Igual que `checkRlsRole` pero lanza. Fail-closed para el arranque/health. */
export async function assertRlsRoleSafe(client: RoleProbeClient): Promise<RlsRoleCheck> {
  const check = await checkRlsRole(client);
  if (!check.ok) throw new RlsRoleUnsafeError(check);
  return check;
}
