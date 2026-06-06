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

import { osTasksCanonicalApi } from "@/features/os-shell/tareas/api";

describe("osTasksCanonicalApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists with filters", async () => {
    getMock.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20 });
    await osTasksCanonicalApi.list({
      page: 1,
      page_size: 20,
      q: "brief",
      status: "pending",
      priority: "high",
      project_id: "p1",
      client_id: "c1",
    });
    expect(getMock).toHaveBeenCalledWith(
      "/api/v1/os/tasks?page=1&page_size=20&q=brief&status=pending&priority=high&project_id=p1&client_id=c1",
      { tenantScoped: true },
    );
  });

  it("creates task", async () => {
    postMock.mockResolvedValue({ id: "uuid-1" });
    await osTasksCanonicalApi.create({ title: "Tarea A" });
    expect(postMock).toHaveBeenCalledWith("/api/v1/os/tasks", {
      body: { title: "Tarea A" },
      tenantScoped: true,
    });
  });

  it("archives via DELETE", async () => {
    deleteMock.mockResolvedValue({ message: "ok", id: "uuid-1", status: "archived" });
    await osTasksCanonicalApi.archive("uuid-1");
    expect(deleteMock).toHaveBeenCalledWith("/api/v1/os/tasks/uuid-1", { tenantScoped: true });
  });
});
