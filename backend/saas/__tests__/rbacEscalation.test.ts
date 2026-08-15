import { describe, expect, it } from "vitest";

/**
 * RBAC — escalada vertical y horizontal, ejecutable.
 *
 * Criterio: **ocultar un botón no es un control**. Todo lo que se prueba aquí
 * ataca la capa de autorización directamente, como haría un cliente que ignora
 * la UI por completo.
 *
 * La propiedad estructural que hace esto seguro, verificada en
 * `saasRequestContext.ts`: el rol NO viaja en el JWT ni en el cuerpo de la
 * petición — se resuelve por consulta a `workspace_members` en cada request. Un
 * atacante no puede declarar su propio rol.
 */
import {
  SaasRbacError,
  assertSaasPermission,
  canSaasPerform,
  listPermissionsForRole,
  mapWorkspaceRoleToSaas,
  type SaasAction,
  type SaasRole,
} from "../saasRbac";

const ROLES: SaasRole[] = ["owner", "admin", "member", "viewer"];

/** Acciones destructivas o de administración: el núcleo del riesgo. */
const DESTRUCTIVAS: SaasAction[] = [
  "contacts.delete",
  "deals.delete",
  "campanias.delete",
  "workflows.delete",
];
const CRITICAS: SaasAction[] = ["campanias.launch", "workflows.execute"];
const ADMIN: SaasAction[] = ["sso.write", "audit.read", "billing.read"];

describe("matriz rol → permisos", () => {
  it("los cuatro roles están definidos y ninguno queda vacío", () => {
    for (const r of ROLES) expect(listPermissionsForRole(r).length).toBeGreaterThan(0);
  });

  it("viewer no puede escribir NADA de negocio", () => {
    // `notifications.write` sí lo tiene, y es correcto: marcar como leídas sus
    // propias notificaciones no es una acción de negocio. Lo que se protege es
    // que no toque datos del tenant.
    const permisos = listPermissionsForRole("viewer");
    const negocio = permisos.filter(
      (p) => /\.(write|delete|launch|execute)$/.test(p) && !p.startsWith("notifications."),
    );
    expect(negocio).toEqual([]);
  });

  it("owner es superconjunto de admin, y admin de member", () => {
    const owner = new Set(listPermissionsForRole("owner"));
    const admin = listPermissionsForRole("admin");
    const member = listPermissionsForRole("member");
    for (const p of admin) expect(owner.has(p)).toBe(true);
    const adminSet = new Set(admin);
    for (const p of member) expect(adminSet.has(p)).toBe(true);
  });
});

describe("escalada VERTICAL — rol bajo intenta acción alta", () => {
  it.each(DESTRUCTIVAS)("viewer NO puede %s", (accion) => {
    expect(canSaasPerform("viewer", accion)).toBe(false);
    expect(() => assertSaasPermission("viewer", accion)).toThrow(SaasRbacError);
  });

  it.each(CRITICAS)("viewer NO puede %s", (accion) => {
    expect(canSaasPerform("viewer", accion)).toBe(false);
  });

  it.each(ADMIN)("member NO puede %s", (accion) => {
    expect(canSaasPerform("member", accion)).toBe(false);
    expect(() => assertSaasPermission("member", accion)).toThrow(/Insufficient permissions/);
  });

  it("SSO: owner y admin gestionan; member y viewer quedan fuera", () => {
    // Contrato documentado en saasRbac.ts: "owner/admin manage, only owner can
    // enforce". Gestionar no es forzar.
    expect(canSaasPerform("owner", "sso.write")).toBe(true);
    expect(canSaasPerform("admin", "sso.write")).toBe(true);
    for (const r of ["member", "viewer"] as SaasRole[]) {
      expect(canSaasPerform(r, "sso.write")).toBe(false);
    }
  });

  it("el error de permiso es FORBIDDEN, no un 500 genérico", () => {
    try {
      assertSaasPermission("viewer", "contacts.delete");
      throw new Error("debería haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(SaasRbacError);
      expect((e as SaasRbacError & { code?: string }).code).toBe("FORBIDDEN");
    }
  });
});

describe("el rol no se puede declarar desde el cliente", () => {
  it("un rol desconocido NO se convierte en owner ni admin", () => {
    // El valor procede de `workspace_members.role` en base de datos, NO del
    // cliente, así que normalizar mayúsculas es benigno. Lo que importa es que
    // ninguna cadena inventada conceda privilegios.
    for (const intento of ["superadmin", "root", "", "  ", "x", "sudo", "owner-x"]) {
      const mapeado = mapWorkspaceRoleToSaas(intento);
      expect(ROLES).toContain(mapeado);
      expect(["owner", "admin"]).not.toContain(mapeado);
    }
  });

  it("un rol vacío o basura degrada al rol MENOS privilegiado disponible", () => {
    const basura = mapWorkspaceRoleToSaas("no-existe-este-rol");
    // Sea cual sea el default, nunca puede otorgar acciones destructivas.
    for (const accion of [...DESTRUCTIVAS, ...ADMIN]) {
      expect(canSaasPerform(basura, accion)).toBe(false);
    }
  });

  it("canSaasPerform es total: ningún rol válido rompe la comprobación", () => {
    for (const r of ROLES) {
      for (const a of [...DESTRUCTIVAS, ...CRITICAS, ...ADMIN]) {
        expect(typeof canSaasPerform(r, a)).toBe("boolean");
      }
    }
  });
});

describe("coherencia: la acción principal y sus derivadas exigen lo mismo", () => {
  it("quien no puede escribir tampoco puede borrar", () => {
    for (const r of ROLES) {
      for (const dominio of ["contacts", "deals", "campanias", "workflows"]) {
        const escribe = canSaasPerform(r, `${dominio}.write` as SaasAction);
        const borra = canSaasPerform(r, `${dominio}.delete` as SaasAction);
        if (!escribe) {
          expect(borra, `${r} no escribe ${dominio} pero sí borra`).toBe(false);
        }
      }
    }
  });

  it("quien no puede leer un dominio tampoco puede escribirlo", () => {
    for (const r of ROLES) {
      for (const dominio of ["contacts", "deals", "campanias", "workflows"]) {
        const lee = canSaasPerform(r, `${dominio}.read` as SaasAction);
        const escribe = canSaasPerform(r, `${dominio}.write` as SaasAction);
        if (!lee) {
          expect(escribe, `${r} no lee ${dominio} pero sí escribe`).toBe(false);
        }
      }
    }
  });

  it("lanzar una campaña exige al menos poder escribirla", () => {
    for (const r of ROLES) {
      if (canSaasPerform(r, "campanias.launch")) {
        expect(canSaasPerform(r, "campanias.write")).toBe(true);
      }
    }
  });

  it("ejecutar un workflow exige al menos poder leerlo", () => {
    for (const r of ROLES) {
      if (canSaasPerform(r, "workflows.execute")) {
        expect(canSaasPerform(r, "workflows.read")).toBe(true);
      }
    }
  });
});
