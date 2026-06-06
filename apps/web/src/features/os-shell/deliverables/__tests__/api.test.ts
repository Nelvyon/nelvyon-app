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

import { osDeliverablesApi } from "@/features/os-shell/deliverables/api";

describe("osDeliverablesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists with query params and tenant scope", async () => {
    getMock.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200 });
    await osDeliverablesApi.list({ status: "draft", client_id: "c1" });
    expect(getMock).toHaveBeenCalledWith(
      "/api/v1/os/deliverables?status=draft&client_id=c1",
      { tenantScoped: true },
    );
  });

  it("creates deliverable", async () => {
    postMock.mockResolvedValue({ id: "d1" });
    const body = { client_id: "c1", project_id: "p1", title: "Informe" };
    await osDeliverablesApi.create(body);
    expect(postMock).toHaveBeenCalledWith("/api/v1/os/deliverables", {
      body,
      tenantScoped: true,
    });
  });

  it("patches deliverable", async () => {
    patchMock.mockResolvedValue({ id: "d1", title: "Nuevo" });
    await osDeliverablesApi.update("d1", { title: "Nuevo" });
    expect(patchMock).toHaveBeenCalledWith("/api/v1/os/deliverables/d1", {
      body: { title: "Nuevo" },
      tenantScoped: true,
    });
  });

  it("runs workflow actions", async () => {
    postMock.mockResolvedValue({ id: "d1", status: "in_review" });
    await osDeliverablesApi.submitReview("d1");
    expect(postMock).toHaveBeenCalledWith("/api/v1/os/deliverables/d1/submit-review", {
      tenantScoped: true,
    });

    await osDeliverablesApi.publish("d1");
    expect(postMock).toHaveBeenCalledWith("/api/v1/os/deliverables/d1/publish", {
      tenantScoped: true,
    });
  });

  it("rejects with optional notes", async () => {
    postMock.mockResolvedValue({ id: "d1", status: "rejected" });
    await osDeliverablesApi.reject("d1", "incompleto");
    expect(postMock).toHaveBeenCalledWith("/api/v1/os/deliverables/d1/reject", {
      body: { review_notes: "incompleto" },
      tenantScoped: true,
    });
  });

  it("lists versions and client reviews", async () => {
    getMock.mockResolvedValue({ items: [], total: 0 });
    await osDeliverablesApi.listVersions("d1");
    expect(getMock).toHaveBeenCalledWith("/api/v1/os/deliverables/d1/versions", {
      tenantScoped: true,
    });
    await osDeliverablesApi.listClientReviews("d1");
    expect(getMock).toHaveBeenCalledWith("/api/v1/os/deliverables/d1/client-reviews", {
      tenantScoped: true,
    });
  });
});
