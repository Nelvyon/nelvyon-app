import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { ApiError } from "@/core/api/types";

const listMock = vi.fn();
const listClientsMock = vi.fn();

vi.mock("@/features/os-shell/projects/api", () => ({
  osProjectsCanonicalApi: {
    list: (...args: unknown[]) => listMock(...args),
  },
}));

vi.mock("@/features/os-shell/clients/api", () => ({
  osClientsCanonicalApi: {
    list: (...args: unknown[]) => listClientsMock(...args),
  },
}));

vi.mock("@/features/os-shell/projects/featureFlag", () => ({
  isOsProjectsCanonicalUiEnabled: () => true,
}));

vi.mock("@/features/os-shell/hooks/useOsPermissions", () => ({
  useOsPermissions: () => ({ canCreate: true, canEdit: true, canDelete: true }),
}));

vi.mock("@/features/os-shell/components/OsShellLayout", () => ({
  OsShellLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { OsProjectsListView } from "@/features/os-shell/projects/OsProjectsListView";

describe("OsProjectsListView (canonical)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listClientsMock.mockResolvedValue({ items: [], total: 0 });
  });

  it("shows loading then projects", async () => {
    listMock.mockResolvedValue({
      items: [{ id: "p1", client_id: "c1", name: "Web ACME", status: "active", priority: "high" }],
      total: 1,
      page: 1,
      page_size: 20,
    });
    render(<OsProjectsListView />);
    expect(screen.getByText(/Cargando proyectos/i)).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Web ACME")).toBeTruthy());
  });

  it("shows empty state", async () => {
    listMock.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });
    render(<OsProjectsListView />);
    await waitFor(() => expect(screen.getByText(/Sin proyectos/i)).toBeTruthy());
  });

  it("shows API error", async () => {
    listMock.mockRejectedValue(new ApiError({ message: "Error de red", status: 500 }));
    render(<OsProjectsListView />);
    await waitFor(() => expect(screen.getByText("Error de red")).toBeTruthy());
  });
});
