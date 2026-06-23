import { describe, expect, it, vi, afterEach } from "vitest";

import { saasCrmApi } from "../api";

describe("saasCrmApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listContacts calls /api/saas/crm/contacts with filters", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ contacts: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await saasCrmApi.listContacts({ status: "lead", search: "acme" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/saas/crm/contacts"),
      expect.objectContaining({ credentials: "same-origin" }),
    );
    const url = String(mockFetch.mock.calls[0]?.[0]);
    expect(url).toContain("status=lead");
    expect(url).toContain("search=acme");
  });

  it("getPipelineSummary calls /api/saas/crm/pipeline", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pipeline: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await saasCrmApi.getPipelineSummary();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/saas/crm/pipeline",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });
});
