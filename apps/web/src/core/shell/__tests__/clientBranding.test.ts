import { getBreadcrumbs } from "@/core/shell/breadcrumbTypes";
import { getNavItemsForRole } from "@/core/shell/navConfig";
import { getRoutePageMeta } from "@/core/shell/routePageRegistry";

describe("client mode branding and surface", () => {
  it("uses client-safe nav labels and hides internal modules", () => {
    const nav = getNavItemsForRole("admin", "client");
    const labels = nav.map((n) => n.label);
    // Client portal items keep their original labels; support nav gets mapped
    expect(labels).toEqual(expect.arrayContaining(["Inicio", "Proyectos", "Entregables"]));
    expect(nav.some((n) => n.module === "os")).toBe(false);
    expect(nav.some((n) => n.module === "billing")).toBe(true);
  });

  it("returns client-safe route metadata for allowed pages", () => {
    const meta = getRoutePageMeta("/inbox/tickets/4", "client");
    expect(meta.heading).toContain("Request");
    expect(meta.documentTitle).not.toContain("NELVYON");
    expect(meta.documentTitle).not.toContain("OS");
  });

  it("keeps billing title white-label in client mode", () => {
    const meta = getRoutePageMeta("/billing", "client");
    expect(meta.documentTitle).toContain("Billing");
    expect(meta.documentTitle).not.toContain("NELVYON");
  });

  it("supports client account metadata and breadcrumb", () => {
    const meta = getRoutePageMeta("/account", "client");
    expect(meta.heading).toBe("Account");
    expect(meta.documentTitle).toContain("Account");
    const crumbs = getBreadcrumbs("/account", "client");
    expect(crumbs[0]?.label).toBe("Account");
  });

  it("renames breadcrumbs in client mode", () => {
    const crumbs = getBreadcrumbs("/campaigns/9", "client");
    expect(crumbs[0]?.label).toBe("Projects");
    expect(crumbs[1]?.label).toContain("Project");
  });
});

