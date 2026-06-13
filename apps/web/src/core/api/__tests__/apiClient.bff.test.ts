import { describe, expect, it } from "vitest";

import { isNextBffPath } from "@/core/api/apiClient";

describe("isNextBffPath", () => {
  it("routes platform BFF through same-origin", () => {
    expect(isNextBffPath("/api/platform/workspaces/list")).toBe(true);
    expect(isNextBffPath("/api/platform/campaigns")).toBe(true);
    expect(isNextBffPath("/api/auth/login")).toBe(true);
  });

  it("routes FastAPI /api/v1 through external baseUrl", () => {
    expect(isNextBffPath("/api/v1/workspace/list")).toBe(false);
    expect(isNextBffPath("/api/v1/entities/nelvyon_clients")).toBe(false);
  });
});
