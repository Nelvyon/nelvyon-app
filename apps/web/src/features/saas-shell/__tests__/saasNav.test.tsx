import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SaasSidebar } from "../components/SaasSidebar";
import { SAAS_NAV_ITEMS, SAAS_HIDDEN_ROUTES, isSaasNavActive } from "../saasNav";
import { resetSaasPermissionsCacheForTests } from "../useSaasPermissions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/saas/dashboard",
}));

beforeEach(() => {
  resetSaasPermissionsCacheForTests();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ role: "owner", permissions: ["billing.read", "settings.read"], tenant: { companyName: "Acme", plan: "pro" } }),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  resetSaasPermissionsCacheForTests();
});

describe("saasNav", () => {
  it("lists only production-ready SaaS modules", () => {
    const labels = SAAS_NAV_ITEMS.map((i) => i.label);
    // Core modules must be present
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("CRM");
    expect(labels).toContain("Pipeline");
    expect(labels).toContain("Workflows");
    expect(labels).toContain("Facturación");
    expect(labels).toContain("Configuración");
    // Legacy/OS routes must not be present as labels
    expect(labels).not.toContain("Servicios");
  });

  it("does not expose legacy CRM or OS routes in nav", () => {
    const hrefs = SAAS_NAV_ITEMS.map((i) => i.href);
    for (const legacy of SAAS_HIDDEN_ROUTES.legacyCrm) {
      expect(hrefs).not.toContain(legacy);
    }
    for (const os of SAAS_HIDDEN_ROUTES.os) {
      expect(hrefs).not.toContain(os);
    }
  });

  it("isSaasNavActive matches current section", () => {
    expect(isSaasNavActive("crm", "crm")).toBe(true);
    expect(isSaasNavActive("crm", "pipeline")).toBe(false);
  });
});

describe("SaasSidebar", () => {
  it("renders clickable nav links for active modules", async () => {
    // activeId="billing" opens the "cuenta" group so billing/settings links render
    render(<SaasSidebar activeId="billing" tenantCompany="Acme" tenantPlan="pro" />);
    expect(screen.getByTestId("saas-sidebar")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Facturación" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Facturación" })).toHaveAttribute("href", "/saas/billing");
    expect(screen.getByRole("link", { name: "Configuración" })).toHaveAttribute("href", "/saas/settings");
  });
});
