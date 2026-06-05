import { describe, expect, it } from "vitest";

import { filterSaasNavForPermissions } from "../saasNav";
import { hasSaasPermission, saasForbiddenMessage, saasRoleLabel } from "../saasPermissions";

describe("saasPermissions", () => {
  const viewerPerms = ["contacts.read", "deals.read", "campanias.read", "workflows.read", "settings.read"];
  const memberPerms = [...viewerPerms, "contacts.write", "deals.write"];
  const adminPerms = [...memberPerms, "contacts.delete", "deals.delete", "billing.read", "campanias.write", "workflows.write"];

  it("viewer cannot write or delete", () => {
    expect(hasSaasPermission(viewerPerms, "contacts.write")).toBe(false);
    expect(hasSaasPermission(viewerPerms, "deals.delete")).toBe(false);
  });

  it("member can write but not delete or billing", () => {
    expect(hasSaasPermission(memberPerms, "contacts.write")).toBe(true);
    expect(hasSaasPermission(memberPerms, "contacts.delete")).toBe(false);
    expect(hasSaasPermission(memberPerms, "billing.read")).toBe(false);
  });

  it("admin has delete and billing", () => {
    expect(hasSaasPermission(adminPerms, "contacts.delete")).toBe(true);
    expect(hasSaasPermission(adminPerms, "billing.read")).toBe(true);
  });

  it("saasRoleLabel returns Spanish labels", () => {
    expect(saasRoleLabel("viewer")).toBe("Solo lectura");
    expect(saasRoleLabel("owner")).toBe("Propietario");
  });

  it("saasForbiddenMessage is human readable", () => {
    expect(saasForbiddenMessage("billing.read")).toContain("facturación");
  });

  it("filterSaasNav hides billing for member and viewer", () => {
    const viewerNav = filterSaasNavForPermissions(viewerPerms);
    expect(viewerNav.some((i) => i.id === "billing")).toBe(false);
    expect(viewerNav.some((i) => i.id === "settings")).toBe(true);

    const memberNav = filterSaasNavForPermissions(memberPerms);
    expect(memberNav.some((i) => i.id === "billing")).toBe(false);

    const adminNav = filterSaasNavForPermissions(adminPerms);
    expect(adminNav.some((i) => i.id === "billing")).toBe(true);
  });
});
