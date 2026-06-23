import { describe, it, expect, vi } from "vitest";

describe("saasWorkflowDispatch form_submitted + tag_added", () => {
  it("dispatchFormSubmitted calls dispatchActiveWorkflows with form_submitted trigger", async () => {
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    const { dispatchFormSubmitted } = await import("../saasWorkflowDispatch");
    await dispatchFormSubmitted("tenant-x", "form-1", "contact-1", { email: "a@b.com" });
    expect(mockDispatch).toHaveBeenCalledWith("tenant-x", "form_submitted", expect.objectContaining({
      form: { id: "form-1" },
      contact: { id: "contact-1" },
    }));
    vi.restoreAllMocks();
  });

  it("dispatchFormSubmitted does not throw even if workflow service errors", async () => {
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: vi.fn().mockRejectedValue(new Error("DB down")) }),
    }));
    const { dispatchFormSubmitted } = await import("../saasWorkflowDispatch");
    await expect(dispatchFormSubmitted("t", "f", null, {})).resolves.toBeUndefined();
    vi.restoreAllMocks();
  });

  it("dispatchTagAdded calls with tag_added trigger", async () => {
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    const { dispatchTagAdded } = await import("../saasWorkflowDispatch");
    await dispatchTagAdded("tenant-y", "contact-2", "vip");
    expect(mockDispatch).toHaveBeenCalledWith("tenant-y", "tag_added", expect.objectContaining({
      contact: { id: "contact-2" },
      tag: "vip",
    }));
    vi.restoreAllMocks();
  });
});
