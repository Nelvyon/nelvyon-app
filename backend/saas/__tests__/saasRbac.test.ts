import { describe, expect, it } from "vitest";

import {
  assertSaasPermission,
  canSaasPerform,
  mapWorkspaceRoleToSaas,
  SaasRbacError,
} from "../saasRbac";

describe("saasRbac", () => {
  it("owner can delete contacts and read billing", () => {
    expect(canSaasPerform("owner", "contacts.delete")).toBe(true);
    expect(canSaasPerform("owner", "billing.read")).toBe(true);
  });

  it("member can write but not delete or read billing", () => {
    expect(canSaasPerform("member", "contacts.write")).toBe(true);
    expect(canSaasPerform("member", "contacts.delete")).toBe(false);
    expect(canSaasPerform("member", "billing.read")).toBe(false);
  });

  it("viewer is read-only", () => {
    expect(canSaasPerform("viewer", "contacts.read")).toBe(true);
    expect(canSaasPerform("viewer", "contacts.write")).toBe(false);
    expect(canSaasPerform("viewer", "deals.write")).toBe(false);
  });

  it("assertSaasPermission throws FORBIDDEN", () => {
    expect(() => assertSaasPermission("viewer", "deals.delete")).toThrow(SaasRbacError);
  });

  it("maps workspace roles to SaaS roles", () => {
    // `operator` deja de colapsarse en `member`: es un rol propio con autoridad
    // de trabajo, tal y como ya lo trataba `require_workspace_operator` en el
    // upstream. Ver `apps/web/src/lib/__tests__/rolesDesacoplados.test.ts`.
    expect(mapWorkspaceRoleToSaas("owner")).toBe("owner");
    expect(mapWorkspaceRoleToSaas("admin")).toBe("admin");
    expect(mapWorkspaceRoleToSaas("operator")).toBe("operator");
    expect(mapWorkspaceRoleToSaas("member")).toBe("member");
    expect(mapWorkspaceRoleToSaas("viewer")).toBe("viewer");
  });
});
