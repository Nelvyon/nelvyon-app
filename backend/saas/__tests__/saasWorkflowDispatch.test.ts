import { describe, it, expect, vi } from "vitest";

describe("saasWorkflowDispatch form_submitted + tag_added", () => {
  const mockSequences = () => {
    vi.doMock("../SaasSequencesService", () => ({
      getSaasSequencesService: () => ({ list: vi.fn().mockResolvedValue([]), enroll: vi.fn() }),
    }));
  };

  it("dispatchFormSubmitted calls dispatchActiveWorkflows with form_submitted trigger", async () => {
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    mockSequences();
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
    mockSequences();
    const { dispatchTagAdded } = await import("../saasWorkflowDispatch");
    await dispatchTagAdded("tenant-y", "contact-2", "vip");
    expect(mockDispatch).toHaveBeenCalledWith("tenant-y", "tag_added", expect.objectContaining({
      contact: { id: "contact-2" },
      tag: "vip",
    }));
    vi.restoreAllMocks();
  });
});

describe("saasWorkflowDispatch sequence auto-triggers", () => {
  it("dispatchContactCreated enrolls contact in active contact_created sequences", async () => {
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    const mockEnroll = vi.fn().mockResolvedValue(undefined);
    const mockList = vi.fn().mockResolvedValue([
      { id: "seq-1", status: "active", triggerType: "contact_created" },
      { id: "seq-2", status: "paused", triggerType: "contact_created" },
      { id: "seq-3", status: "active", triggerType: "form_submitted" },
    ]);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    vi.doMock("../SaasSequencesService", () => ({
      getSaasSequencesService: () => ({ list: mockList, enroll: mockEnroll }),
    }));
    const { dispatchContactCreated } = await import("../saasWorkflowDispatch");
    await dispatchContactCreated("tenant-a", {
      id: "contact-99",
      tenantId: "tenant-a",
      name: "Test",
      email: "test@example.com",
      phone: null,
      company: null,
      position: null,
      status: "active",
      pipelineStage: "lead",
      value: 0,
      notes: null,
      tags: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(mockList).toHaveBeenCalledWith("tenant-a");
    expect(mockEnroll).toHaveBeenCalledTimes(1);
    expect(mockEnroll).toHaveBeenCalledWith("tenant-a", "seq-1", "contact-99");
    vi.restoreAllMocks();
  });

  it("dispatchFormSubmitted enrolls contact when contactId is present", async () => {
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    const mockEnroll = vi.fn().mockResolvedValue(undefined);
    const mockList = vi.fn().mockResolvedValue([
      { id: "seq-form", status: "active", triggerType: "form_submitted" },
    ]);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    vi.doMock("../SaasSequencesService", () => ({
      getSaasSequencesService: () => ({ list: mockList, enroll: mockEnroll }),
    }));
    const { dispatchFormSubmitted } = await import("../saasWorkflowDispatch");
    await dispatchFormSubmitted("tenant-b", "form-2", "contact-5", { email: "a@b.com" });
    expect(mockEnroll).toHaveBeenCalledWith("tenant-b", "seq-form", "contact-5");
    vi.restoreAllMocks();
  });

  it("dispatchFormSubmitted skips sequence enroll when contactId is null", async () => {
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    const mockEnroll = vi.fn().mockResolvedValue(undefined);
    const mockList = vi.fn().mockResolvedValue([]);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    vi.doMock("../SaasSequencesService", () => ({
      getSaasSequencesService: () => ({ list: mockList, enroll: mockEnroll }),
    }));
    const { dispatchFormSubmitted } = await import("../saasWorkflowDispatch");
    await dispatchFormSubmitted("tenant-c", "form-3", null, {});
    expect(mockList).not.toHaveBeenCalled();
    expect(mockEnroll).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("dispatchTagAdded enrolls contact in active tag_added sequences", async () => {
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    const mockEnroll = vi.fn().mockResolvedValue(undefined);
    const mockList = vi.fn().mockResolvedValue([
      { id: "seq-tag", status: "active", triggerType: "tag_added" },
    ]);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    vi.doMock("../SaasSequencesService", () => ({
      getSaasSequencesService: () => ({ list: mockList, enroll: mockEnroll }),
    }));
    const { dispatchTagAdded } = await import("../saasWorkflowDispatch");
    await dispatchTagAdded("tenant-d", "contact-7", "vip");
    expect(mockEnroll).toHaveBeenCalledWith("tenant-d", "seq-tag", "contact-7");
    vi.restoreAllMocks();
  });

  it("sequence enroll errors are logged but do not throw", async () => {
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    const mockEnroll = vi.fn().mockRejectedValue(new Error("enroll failed"));
    const mockList = vi.fn().mockResolvedValue([
      { id: "seq-1", status: "active", triggerType: "tag_added" },
    ]);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    vi.doMock("../SaasSequencesService", () => ({
      getSaasSequencesService: () => ({ list: mockList, enroll: mockEnroll }),
    }));
    const { dispatchTagAdded } = await import("../saasWorkflowDispatch");
    await expect(dispatchTagAdded("tenant-e", "contact-8", "vip")).resolves.toBeUndefined();
    vi.restoreAllMocks();
  });
});
