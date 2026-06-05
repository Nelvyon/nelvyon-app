import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SaasSidebar } from "../components/SaasSidebar";
import { SAAS_NAV_ITEMS, SAAS_HIDDEN_ROUTES, isSaasNavActive } from "../saasNav";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ permissions: ["billing.read", "settings.read"] }),
    }),
  );
});

describe("saasNav", () => {
  it("lists only production-ready SaaS modules", () => {
    const labels = SAAS_NAV_ITEMS.map((i) => i.label);
    expect(labels).toEqual(["Dashboard", "CRM", "Pipeline", "Campanas", "Workflows", "Facturacion", "Configuracion"]);
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
    render(<SaasSidebar activeId="dashboard" tenantCompany="Acme" tenantPlan="pro" />);
    expect(screen.getByTestId("saas-sidebar")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Facturacion" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "CRM" })).toHaveAttribute("href", "/saas/crm");
    expect(screen.getByRole("link", { name: "Pipeline" })).toHaveAttribute("href", "/saas/crm?tab=pipeline");
    expect(screen.getByRole("link", { name: "Facturacion" })).toHaveAttribute("href", "/saas/billing");
    expect(screen.getByRole("link", { name: "Configuracion" })).toHaveAttribute("href", "/saas/settings");
  });
});
