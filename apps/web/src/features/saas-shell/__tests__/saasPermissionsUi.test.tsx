import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DealDetailPanel } from "@/features/saas-deals/components/DealDetailPanel";
import { SaasCan } from "@/features/saas-shell/components/SaasCan";
import { resetSaasPermissionsCacheForTests } from "@/features/saas-shell/useSaasPermissions";
import type { SaasAction } from "../saasPermissions";

import type { SaasDeal } from "@/features/saas-deals/types";

const mockDeal: SaasDeal = {
  id: "d1",
  tenantId: "t1",
  contactId: null,
  title: "Oportunidad A",
  value: 1000,
  currency: "EUR",
  stage: "new",
  probability: 10,
  expectedCloseDate: null,
  source: null,
  ownerUserId: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function mockPermissions(permissions: SaasAction[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        role: permissions.includes("billing.read") ? "admin" : permissions.includes("contacts.delete") ? "admin" : "viewer",
        permissions,
        tenant: { companyName: "Acme", plan: "pro" },
      }),
    }),
  );
}

vi.mock("@/features/saas-deals/hooks", () => ({
  useDeleteSaasDeal: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

describe("SaasCan UI", () => {
  beforeEach(() => {
    resetSaasPermissionsCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetSaasPermissionsCacheForTests();
  });

  it("viewer does not see create action child", async () => {
    mockPermissions(["contacts.read", "deals.read", "settings.read"]);
    render(
      <SaasCan action="contacts.write">
        <button type="button">Crear contacto</button>
      </SaasCan>,
    );
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Crear contacto" })).not.toBeInTheDocument();
    });
  });

  it("admin sees delete action child", async () => {
    mockPermissions([
      "contacts.read",
      "contacts.write",
      "contacts.delete",
      "deals.read",
      "deals.write",
      "deals.delete",
      "billing.read",
      "settings.read",
    ]);
    render(
      <SaasCan action="deals.delete">
        <button type="button">Eliminar</button>
      </SaasCan>,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
    });
  });

  it("member does not see delete in DealDetailPanel", async () => {
    mockPermissions(["contacts.read", "contacts.write", "deals.read", "deals.write", "settings.read"]);
    render(
      <DealDetailPanel
        deal={mockDeal}
        contactsById={new Map()}
        onEdit={() => undefined}
        onDeleted={() => undefined}
        onClose={() => undefined}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    });
  });
});
