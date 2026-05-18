import { describe, expect, it, vi } from "vitest";

const getMock = vi.fn();

vi.mock("@/core/api", () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

import { settingsApi } from "@/features/settings/api";

describe("settingsApi.listSecurityEvents", () => {
  it("uses workspace-scoped endpoint with tenant header path", async () => {
    getMock.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 20 });
    await settingsApi.listSecurityEvents({ limit: 20, sort: "-created_at", severity: "warning" });
    expect(getMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/entities/security_events?"),
      expect.objectContaining({ tenantScoped: true }),
    );
  });
});
