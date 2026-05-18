// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../os-agents/OsOrchestrator", () => ({
  OsOrchestrator: {
    enqueueAndDispatch: vi.fn(),
  },
}));

import { OsOrchestrator } from "../../os-agents/OsOrchestrator";
import { DragDropWorkflowService, resetDragDropWorkflowServiceForTests } from "../DragDropWorkflowService";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";
const WF_ID = "00000000-0000-0000-0000-0000000000bb";

describe("DragDropWorkflowService", () => {
  beforeEach(() => {
    resetDragDropWorkflowServiceForTests();
    vi.clearAllMocks();
  });

  it("createWorkflow", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: WF_ID,
        userId: USER_ID,
        name: "WF",
        description: null,
        nodes: [],
        edges: [],
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new DragDropWorkflowService({ db: { query } });
    const out = await svc.createWorkflow(USER_ID, "WF", null, [], []);
    expect(out.name).toBe("WF");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("nodes, edges"), [
      USER_ID,
      "WF",
      null,
      "[]",
      "[]",
    ]);
  });

  it("updateWorkflow", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: WF_ID,
        userId: USER_ID,
        name: "WF2",
        description: null,
        nodes: [{ id: "n1", type: "trigger" }],
        edges: [],
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new DragDropWorkflowService({ db: { query } });
    const out = await svc.updateWorkflow(WF_ID, USER_ID, "WF2", [{ id: "n1", type: "trigger" }], []);
    expect(out.name).toBe("WF2");
    expect(String(query.mock.calls[0][0])).toContain("WHERE id = $1::uuid AND user_id = $2::uuid");
  });

  it("getWorkflow", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: WF_ID,
        userId: USER_ID,
        name: "WF",
        description: "x",
        nodes: [],
        edges: [],
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new DragDropWorkflowService({ db: { query } });
    const out = await svc.getWorkflow(WF_ID, USER_ID);
    expect(out?.id).toBe(WF_ID);
  });

  it("listWorkflows", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: WF_ID,
        userId: USER_ID,
        name: "WF",
        description: "x",
        nodes: [],
        edges: [],
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new DragDropWorkflowService({ db: { query } });
    const out = await svc.listWorkflows(USER_ID);
    expect(out).toHaveLength(1);
  });

  it("deleteWorkflow", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new DragDropWorkflowService({ db: { query } });
    await svc.deleteWorkflow(WF_ID, USER_ID);
    expect(String(query.mock.calls[0][0])).toContain("DELETE FROM dragdrop_workflows");
  });

  it("executeWorkflow con nodos agent", async () => {
    vi.mocked(OsOrchestrator.enqueueAndDispatch)
      .mockResolvedValueOnce({ jobId: "j-1", status: "queued", message: "ok" } as never)
      .mockResolvedValueOnce({ jobId: "j-2", status: "queued", message: "ok" } as never);
    const query = vi.fn().mockResolvedValue([
      {
        id: WF_ID,
        userId: USER_ID,
        name: "WF",
        description: null,
        nodes: [
          { id: "n1", type: "agent", data: { serviceId: "seo_premium" } },
          { id: "n2", type: "trigger", data: {} },
          { id: "n3", type: "agent", data: { serviceId: "ads_premium" } },
        ],
        edges: [],
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new DragDropWorkflowService({ db: { query } });
    const out = await svc.executeWorkflow(WF_ID, USER_ID);
    expect(out.jobIds).toEqual(["j-1", "j-2"]);
    expect(OsOrchestrator.enqueueAndDispatch).toHaveBeenCalledTimes(2);
  });
});
