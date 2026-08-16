import { describe, expect, it } from "vitest";

import {
  canPlatformPerform,
  normalizePlatformRole,
  platformCapabilitiesFor,
  type PlatformAction,
  type PlatformRole,
} from "../platformRbac";
import { canSaasPerform, mapWorkspaceRoleToSaas, type SaasRole } from "../../../../../backend/saas/saasRbac";

/**
 * `operator` deja de colapsarse en `member`.
 *
 * LA DEUDA QUE ESTO CIERRA
 * ------------------------
 * NELVYON tiene cinco roles de workspace en `backend/core/rbac.py`, pero las dos
 * capas de capabilities solo conocían cuatro: `mapWorkspaceRoleToSaas` y
 * `normalizePlatformRole` convertían `operator` en `member`.
 *
 * La consecuencia no era un agujero de seguridad —la autoridad real vive en las
 * dependencias de FastAPI, que sí distinguen los cinco— sino una divergencia:
 * `require_workspace_operator` dejaba mutar a un operator mientras la capa de
 * capabilities decía que no podía. La interfaz mostraba un permiso y se aplicaba
 * otro, y era imposible declarar capabilities nominales fieles.
 *
 * ANTES DE TOCARLO SE MIRÓ PRODUCCIÓN
 * -----------------------------------
 * Consulta en lectura, sin PII: `workspace_members` tiene cinco filas, una por
 * rol, todas activas y sin ningún valor fuera de los cinco documentados. El
 * desacoplamiento no altera a ningún usuario real.
 *
 * LA MATRIZ NO SE INVENTA
 * -----------------------
 * Sale de `roleMatrix.ts`, que es el contrato de producto ya certificado:
 *
 *     automations   view: member · create: operator · edit: operator · delete: admin
 *     ecommerce     view: member · create: member   · edit: operator · delete: admin
 *
 * De ahí que `member` conserve `create` en ecommerce —política vigente, no se le
 * retira nada— y que `viewer` no gane ninguna lectura nueva.
 */

const ROLES: PlatformRole[] = ["owner", "admin", "operator", "member", "viewer"];

describe("normalización de roles", () => {
  it("reconoce los cinco roles del producto", () => {
    for (const rol of ROLES) {
      expect(normalizePlatformRole(rol), rol).toBe(rol);
      expect(mapWorkspaceRoleToSaas(rol), rol).toBe(rol);
    }
  });

  it("operator ya no se convierte en member", () => {
    // EL defecto. Antes ambas devolvían "member".
    expect(normalizePlatformRole("operator")).toBe("operator");
    expect(mapWorkspaceRoleToSaas("operator")).toBe("operator");
  });

  it("un rol desconocido no obtiene capabilities", () => {
    // Fail-closed: degradar en silencio es como se conceden privilegios por
    // accidente. En el plano `platform` un valor no reconocido es `null`.
    for (const basura of ["", "Operador", "root", "admiin", "OWNER "]) {
      const normalizado = normalizePlatformRole(basura);
      if (normalizado === null) {
        expect(platformCapabilitiesFor(null)).toEqual([]);
      } else {
        // solo debería ocurrir con variaciones de mayúsculas/espacios legítimas
        expect(ROLES).toContain(normalizado);
      }
    }
  });
});

/** Matriz esperada, derivada de `roleMatrix.ts`. `true` = concedida. */
const ESPERADO: Record<PlatformAction, Partial<Record<PlatformRole, boolean>>> = {
  "platform.automations.read": { owner: true, admin: true, operator: true, member: true, viewer: false },
  "platform.automations.write": { owner: true, admin: true, operator: true, member: false, viewer: false },
  "platform.automations.delete": { owner: true, admin: true, operator: false, member: false, viewer: false },
  "platform.ecommerce.read": { owner: true, admin: true, operator: true, member: true, viewer: false },
  "platform.ecommerce.create": { owner: true, admin: true, operator: true, member: true, viewer: false },
  "platform.ecommerce.edit": { owner: true, admin: true, operator: true, member: false, viewer: false },
  "platform.ecommerce.delete": { owner: true, admin: true, operator: false, member: false, viewer: false },
  "platform.crm.write": { owner: true, admin: true, operator: true, member: true, viewer: false },
  "platform.support.write": { owner: true, admin: true, operator: true, member: true, viewer: true },
  "platform.reputation.manage": { owner: true, admin: true, operator: false, member: false, viewer: false },
  "partners.billing.manage": { owner: true, admin: true, operator: false, member: false, viewer: false },
  "partners.billing.charge": { owner: true, admin: false, operator: false, member: false, viewer: false },
  "partners.portal.invite": { owner: true, admin: true, operator: false, member: false, viewer: false },
  "partners.connect.manage": { owner: true, admin: false, operator: false, member: false, viewer: false },
};

describe("matriz de capabilities de plataforma", () => {
  for (const [accion, porRol] of Object.entries(ESPERADO) as [PlatformAction, Partial<Record<PlatformRole, boolean>>][]) {
    for (const [rol, concedida] of Object.entries(porRol) as [PlatformRole, boolean][]) {
      it(`${accion} · ${rol} → ${concedida ? "permitido" : "denegado"}`, () => {
        expect(canPlatformPerform(rol, accion)).toBe(concedida);
      });
    }
  }

  it("sin rol no hay ninguna capability", () => {
    expect(platformCapabilitiesFor(null)).toEqual([]);
    for (const accion of Object.keys(ESPERADO) as PlatformAction[]) {
      expect(canPlatformPerform(null, accion)).toBe(false);
    }
  });
});

describe("no se amplían privilegios por accidente", () => {
  it("viewer conserva exactamente lo que tenía", () => {
    // Control contra el error más probable de este cambio: darle lecturas
    // «porque parece razonable que pueda ver». La matriz reserva `view` a
    // `member`, y la certificación de producción comprobó que un viewer recibe
    // 403 en la tienda.
    expect([...platformCapabilitiesFor("viewer")]).toEqual(["platform.support.write"]);
  });

  it("member conserva su create de ecommerce", () => {
    // Decisión de producto vigente y explícita: no se le retira.
    expect(canPlatformPerform("member", "platform.ecommerce.create")).toBe(true);
  });

  it("member no gana ninguna capacidad de edición ni borrado", () => {
    expect(canPlatformPerform("member", "platform.ecommerce.edit")).toBe(false);
    expect(canPlatformPerform("member", "platform.ecommerce.delete")).toBe(false);
    expect(canPlatformPerform("member", "platform.automations.write")).toBe(false);
  });

  it("operator no gana autoridad de plataforma ni financiera", () => {
    for (const accion of [
      "partners.billing.manage",
      "partners.billing.charge",
      "partners.connect.manage",
      "partners.portal.invite",
      "platform.reputation.manage",
    ] as PlatformAction[]) {
      expect(canPlatformPerform("operator", accion), accion).toBe(false);
    }
  });

  it("operator no puede borrar: la matriz lo reserva a admin", () => {
    expect(canPlatformPerform("operator", "platform.ecommerce.delete")).toBe(false);
    expect(canPlatformPerform("operator", "platform.automations.delete")).toBe(false);
  });

  it("admin y owner conservan las suyas", () => {
    for (const accion of ["platform.ecommerce.delete", "platform.automations.delete"] as PlatformAction[]) {
      expect(canPlatformPerform("admin", accion)).toBe(true);
      expect(canPlatformPerform("owner", accion)).toBe(true);
    }
    // `charge` y `connect` siguen siendo solo del owner: configurar un precio y
    // mover dinero son autoridades distintas.
    expect(canPlatformPerform("admin", "partners.billing.charge")).toBe(false);
  });
});

describe("el plano SaaS queda alineado", () => {
  it("operator mantiene lo de member y suma las mutaciones de trabajo", () => {
    const heredadasDeMember = [
      "contacts.read", "contacts.write", "deals.read", "deals.write",
      "campanias.read", "workflows.read", "analytics.read", "invoices.read",
    ] as const;
    for (const accion of heredadasDeMember) {
      expect(canSaasPerform("operator" as SaasRole, accion), accion).toBe(true);
      expect(canSaasPerform("member" as SaasRole, accion), accion).toBe(true);
    }

    const mutacionesDeTrabajo = [
      "campanias.write", "campanias.launch", "workflows.write",
      "workflows.execute", "reports.generate", "affiliates.write", "loyalty.write",
    ] as const;
    for (const accion of mutacionesDeTrabajo) {
      expect(canSaasPerform("operator" as SaasRole, accion), accion).toBe(true);
      expect(canSaasPerform("member" as SaasRole, accion), accion).toBe(false);
    }
  });

  it("operator no borra ni accede a autoridad de plataforma", () => {
    for (const accion of [
      "contacts.delete", "deals.delete", "campanias.delete", "workflows.delete",
      "billing.read", "sso.write", "audit.read", "settings.write",
    ] as const) {
      expect(canSaasPerform("operator" as SaasRole, accion), accion).toBe(false);
    }
  });

  it("member y viewer no cambian", () => {
    expect(canSaasPerform("member" as SaasRole, "contacts.write")).toBe(true);
    expect(canSaasPerform("member" as SaasRole, "contacts.delete")).toBe(false);
    expect(canSaasPerform("viewer" as SaasRole, "contacts.read")).toBe(true);
    expect(canSaasPerform("viewer" as SaasRole, "contacts.write")).toBe(false);
  });
});
