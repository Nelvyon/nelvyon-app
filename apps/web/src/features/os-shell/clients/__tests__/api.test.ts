import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("@/core/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

import { osClientsCanonicalApi } from "@/features/os-shell/clients/api";

describe("osClientsCanonicalApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists with filters and tenant scope", async () => {
    getMock.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    await osClientsCanonicalApi.list({ skip: 0, limit: 20, q: "acme", status: "active", sector: "tech" });
    expect(getMock).toHaveBeenCalledWith(
      "/api/v1/os/clients?skip=0&limit=20&q=acme&status=active&sector=tech",
      { tenantScoped: true },
    );
  });

  it("creates client", async () => {
    postMock.mockResolvedValue({ id: "uuid-1" });
    const body = { business_name: "Acme", contact_email: "a@acme.com" };
    await osClientsCanonicalApi.create(body);
    expect(postMock).toHaveBeenCalledWith("/api/v1/os/clients", { body, tenantScoped: true });
  });

  it("patches client", async () => {
    patchMock.mockResolvedValue({ id: "uuid-1" });
    await osClientsCanonicalApi.update("uuid-1", { business_name: "Acme 2" });
    expect(patchMock).toHaveBeenCalledWith("/api/v1/os/clients/uuid-1", {
      body: { business_name: "Acme 2" },
      tenantScoped: true,
    });
  });

  it("archives via DELETE", async () => {
    deleteMock.mockResolvedValue({ message: "ok", id: "uuid-1", status: "archived" });
    await osClientsCanonicalApi.archive("uuid-1");
    expect(deleteMock).toHaveBeenCalledWith("/api/v1/os/clients/uuid-1", { tenantScoped: true });
  });

  it("gets by id", async () => {
    getMock.mockResolvedValue({ id: "uuid-1" });
    await osClientsCanonicalApi.getById("uuid-1");
    expect(getMock).toHaveBeenCalledWith("/api/v1/os/clients/uuid-1", { tenantScoped: true });
  });
});
