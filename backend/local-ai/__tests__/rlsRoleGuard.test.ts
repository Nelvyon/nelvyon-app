import { describe, expect, it } from "vitest";

/**
 * Guard del rol de PostgreSQL.
 *
 * El aislamiento entre tenants lo hace RLS, y **RLS se salta siempre para
 * superusuarios y para roles con BYPASSRLS**; `FORCE ROW LEVEL SECURITY` cierra
 * el bypass del propietario, no el de estos. Se comprobó contra la base real:
 * con el rol de aplicación no hay fuga; con el superusuario del contenedor, las
 * mismas políticas dan fuga total y B llega a borrar datos de A.
 *
 * Este guard convierte ese fallo silencioso de configuración en uno ruidoso.
 */
import {
  RlsRoleUnsafeError,
  assertRlsRoleSafe,
  checkRlsRole,
  type RoleProbeClient,
} from "../rlsRoleGuard";

/** Doble que devuelve las propiedades de rol que reporte PostgreSQL. */
function clienteConRol(
  current_user: string,
  rolsuper: unknown,
  rolbypassrls: unknown,
): RoleProbeClient {
  return { query: async () => ({ rows: [{ current_user, rolsuper, rolbypassrls }] }) };
}

describe("rol de aplicación seguro", () => {
  it("NOSUPERUSER + NOBYPASSRLS → permitido", async () => {
    const r = await checkRlsRole(clienteConRol("nelvyon_local_app", false, false));
    expect(r.ok).toBe(true);
    expect(r.currentUser).toBe("nelvyon_local_app");
  });

  it("se valida por PROPIEDADES, no por nombre", async () => {
    // Un rol que se llama como el bueno pero tiene BYPASSRLS debe rechazarse.
    const r = await checkRlsRole(clienteConRol("nelvyon_local_app", false, true));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/BYPASSRLS/);

    // Y un rol con otro nombre pero sin privilegios debe aceptarse.
    const ok = await checkRlsRole(clienteConRol("otro_rol_app", false, false));
    expect(ok.ok).toBe(true);
  });
});

describe("roles que desactivan RLS", () => {
  it("superusuario → rechazado", async () => {
    const r = await checkRlsRole(clienteConRol("nelvyon_local", true, false));
    expect(r.ok).toBe(false);
    expect(r.isSuperuser).toBe(true);
    expect(r.reason).toMatch(/SUPERUSER/);
    expect(r.reason).toMatch(/LOCAL_AI_DATABASE_URL/);
  });

  it("BYPASSRLS → rechazado", async () => {
    const r = await checkRlsRole(clienteConRol("rol_bypass", false, true));
    expect(r.ok).toBe(false);
    expect(r.bypassesRls).toBe(true);
  });

  it("el mensaje explica que FORCE no cubre este caso", async () => {
    const r = await checkRlsRole(clienteConRol("nelvyon_local", true, true));
    expect(r.reason).toMatch(/FORCE ROW LEVEL SECURITY no cubre/i);
  });

  it("acepta el formato 't'/'f' que devuelven algunos drivers", async () => {
    expect((await checkRlsRole(clienteConRol("x", "t", "f"))).ok).toBe(false);
    expect((await checkRlsRole(clienteConRol("x", "f", "f"))).ok).toBe(true);
  });
});

describe("fail-closed", () => {
  it("si la comprobación falla, NO se asume que RLS proteja", async () => {
    const roto: RoleProbeClient = {
      query: async () => {
        throw new Error("connection refused");
      },
    };
    const r = await checkRlsRole(roto);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/No se asume que RLS proteja/);
  });

  it("pg_roles sin fila → no ok", async () => {
    const vacio: RoleProbeClient = { query: async () => ({ rows: [] }) };
    expect((await checkRlsRole(vacio)).ok).toBe(false);
  });

  it("assertRlsRoleSafe lanza RlsRoleUnsafeError con el diagnóstico", async () => {
    await expect(assertRlsRoleSafe(clienteConRol("nelvyon_local", true, true))).rejects.toBeInstanceOf(
      RlsRoleUnsafeError,
    );
  });

  it("assertRlsRoleSafe deja pasar el rol correcto", async () => {
    const r = await assertRlsRoleSafe(clienteConRol("nelvyon_local_app", false, false));
    expect(r.ok).toBe(true);
  });
});
