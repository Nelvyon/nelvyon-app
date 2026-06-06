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

import { osProjectsCanonicalApi } from "@/features/os-shell/projects/api";

describe("osProjectsCanonicalApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists with filters and tenant scope", async () => {
    getMock.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });
    await osProjectsCanonicalApi.list({
      page: 1,
      page_size: 20,
      q: "web",
      status: "active",
      priority: "high",
      client_id: "client-uuid",
    });
    expect(getMock).toHaveBeenCalledWith(
      "/api/v1/os/projects?page=1&page_size=20&q=web&status=active&priority=high&client_id=client-uuid",
      { tenantScoped: true },
    );
  });

  it("creates project", async () => {
    postMock.mockResolvedValue({ id: "uuid-1" });
    const body = { client_id: "c-1", name: "Proyecto A" };
    await osProjectsCanonicalApi.create(body);
    expect(postMock).toHaveBeenCalledWith("/api/v1/os/projects", { body, tenantScoped: true });
  });

  it("patches project", async () => {
    patchMock.mockResolvedValue({ id: "uuid-1" });
    await osProjectsCanonicalApi.update("uuid-1", { status: "active" });
    expect(patchMock).toHaveBeenCalledWith("/api/v1/os/projects/uuid-1", {
      body: { status: "active" },
      tenantScoped: true,
    });
  });

  it("archives via DELETE", async () => {
    deleteMock.mockResolvedValue({ message: "ok", id: "uuid-1", status: "archived" });
    await osProjectsCanonicalApi.archive("uuid-1");
    expect(deleteMock).toHaveBeenCalledWith("/api/v1/os/projects/uuid-1", { tenantScoped: true });
  });

  it("gets by id", async () => {
    getMock.mockResolvedValue({ id: "uuid-1" });
    await osProjectsCanonicalApi.getById("uuid-1");
    expect(getMock).toHaveBeenCalledWith("/api/v1/os/projects/uuid-1", { tenantScoped: true });
  });
});
