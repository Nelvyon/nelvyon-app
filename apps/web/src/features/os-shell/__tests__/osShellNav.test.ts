import { describe, expect, it } from "vitest";
import { isOsShellNavActive, osShellBreadcrumbs, OS_SHELL_NAV } from "@/features/os-shell/osShellNav";

describe("osShellNav", () => {
  it("builds breadcrumbs for dashboard", () => {
    const crumbs = osShellBreadcrumbs("/os/dashboard");
    expect(crumbs.map((c) => c.label)).toEqual(["NELVYON OS", "Dashboard"]);
    expect(crumbs[1]?.href).toBe("/os/dashboard");
  });

  it("marks clientes nav active on nested path", () => {
    const item = OS_SHELL_NAV.find((n) => n.href === "/os/clientes")!;
    expect(isOsShellNavActive("/os/clientes", item)).toBe(true);
    expect(isOsShellNavActive("/os/dashboard", item)).toBe(false);
  });

  it("includes core platform modules", () => {
    const hrefs = OS_SHELL_NAV.map((n) => n.href);
    expect(hrefs).toContain("/os/dashboard");
    expect(hrefs).toContain("/os/entregables");
    expect(hrefs).toContain("/os/configuracion");
  });
});
