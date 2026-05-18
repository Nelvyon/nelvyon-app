import { getNavItemsForRole, isNavActive, PRODUCT_NAV } from "@/core/shell/navConfig";

const crmNav = PRODUCT_NAV.find((i) => i.module === "crm")!;

describe("getNavItemsForRole", () => {
  it("hides billing for members (view requires operator)", () => {
    const modules = getNavItemsForRole("member").map((i) => i.module);
    expect(modules).not.toContain("billing");
    expect(modules).toContain("crm");
    expect(modules).toContain("help");
    expect(modules).toContain("settings");
  });

  it("includes billing for operators and admins", () => {
    expect(getNavItemsForRole("operator").some((i) => i.module === "billing")).toBe(true);
    expect(getNavItemsForRole("admin").some((i) => i.module === "billing")).toBe(true);
  });

  it("limits nav to portal-safe modules in client mode", () => {
    const modules = getNavItemsForRole("admin", "client").map((i) => i.module);
    expect(modules).toEqual(expect.arrayContaining(["inbox", "campaigns", "help", "billing"]));
    expect(modules).not.toContain("os");
    expect(modules).not.toContain("settings");
  });
});

describe("isNavActive", () => {
  it("marks CRM active for client routes", () => {
    expect(isNavActive("/crm/clients", crmNav)).toBe(true);
    expect(isNavActive("/crm/clients/12", crmNav)).toBe(true);
    expect(isNavActive("/inbox/tickets", crmNav)).toBe(false);
  });
});
