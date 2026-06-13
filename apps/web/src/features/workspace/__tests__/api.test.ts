import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/core/api", () => ({
  apiClient: { get, post },
}));

import { workspaceApi } from "@/features/workspace/api";

describe("workspaceApi", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("lists workspaces via platform BFF", () => {
    workspaceApi.list();
    expect(get).toHaveBeenCalledWith("/api/platform/workspaces/list", { tenantScoped: false });
  });

  it("creates workspace via platform BFF", () => {
    workspaceApi.create({ name: "Test" });
    expect(post).toHaveBeenCalledWith("/api/platform/workspaces/create", {
      tenantScoped: false,
      body: { name: "Test" },
    });
  });
});
