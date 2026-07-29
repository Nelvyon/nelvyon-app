import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSaasContext = vi.fn();
const isOrchestratorEnabled = vi.fn();
const getAgentOrchestrator = vi.fn();
const listJobs = vi.fn();
const getJob = vi.fn();
const enqueue = vi.fn();
const coordinate = vi.fn();

vi.mock("@nelvyon/saas", () => ({
  requireSaasContext: (...args: unknown[]) => requireSaasContext(...args),
  saasErrorBody: (e: unknown) => ({
    error: e instanceof Error ? e.message : "error",
  }),
  saasErrorStatus: () => 500,
  getAgentOrchestrator: (...args: unknown[]) => getAgentOrchestrator(...args),
  isOrchestratorEnabled: (...args: unknown[]) => isOrchestratorEnabled(...args),
  ORCHESTRATOR_CONTRACT_VERSION: "1.0.0",
  ORCHESTRATOR_RESILIENCE: { maxQueueDepth: 200 },
  OrchestratorNotEnabledError: class OrchestratorNotEnabledError extends Error {
    constructor() {
      super("Agent Orchestrator runtime not enabled");
      this.name = "OrchestratorNotEnabledError";
    }
  },
  InMemoryAgentOrchestrator: class InMemoryAgentOrchestrator {
    listJobs = listJobs;
  },
}));

describe("GET /api/saas/orchestrator", () => {
  beforeEach(() => {
    vi.resetModules();
    requireSaasContext.mockReset();
    isOrchestratorEnabled.mockReset();
    getAgentOrchestrator.mockReset();
    listJobs.mockReset();
    getJob.mockReset();
    enqueue.mockReset();
    coordinate.mockReset();
    requireSaasContext.mockResolvedValue({
      tenant: { id: "tenant-1" },
      claims: { userId: "user-1" },
      role: "owner",
    });
  });

  it("returns status when orchestrator flag is OFF", async () => {
    isOrchestratorEnabled.mockReturnValue(false);
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/saas/orchestrator?resource=status"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
    expect(body.contractVersion).toBe("1.0.0");
    expect(body.rollback).toBe("NELVYON_ORCHESTRATOR_ENABLED=0");
    expect(requireSaasContext).toHaveBeenCalledWith(expect.any(Request), "contacts.read");
  });

  it("lists jobs for in-memory orchestrator when enabled", async () => {
    isOrchestratorEnabled.mockReturnValue(true);
    listJobs.mockReturnValue([{ jobId: "j1" }]);
    const saas = await import("@nelvyon/saas");
    const orch = new saas.InMemoryAgentOrchestrator();
    getAgentOrchestrator.mockReturnValue(orch);

    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/saas/orchestrator?resource=jobs&limit=20"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobs).toEqual([{ jobId: "j1" }]);
    expect(listJobs).toHaveBeenCalledWith("tenant-1", 20);
  });

  it("returns 503 for jobs when orchestrator is disabled", async () => {
    isOrchestratorEnabled.mockReturnValue(false);
    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/saas/orchestrator?resource=jobs"));
    expect(res.status).toBe(503);
  });
});

describe("POST /api/saas/orchestrator", () => {
  beforeEach(() => {
    vi.resetModules();
    requireSaasContext.mockReset();
    isOrchestratorEnabled.mockReset();
    getAgentOrchestrator.mockReset();
    enqueue.mockReset();
    coordinate.mockReset();
    requireSaasContext.mockResolvedValue({
      tenant: { id: "tenant-1" },
      claims: { userId: "user-1" },
      role: "owner",
    });
  });

  it("rejects enqueue when flag is OFF", async () => {
    isOrchestratorEnabled.mockReturnValue(false);
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/saas/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enqueue", agentId: "ceo_supervisor" }),
      }),
    );
    expect(res.status).toBe(503);
    expect(requireSaasContext).toHaveBeenCalledWith(expect.any(Request), "contacts.write");
  });

  it("enqueues a job when enabled", async () => {
    isOrchestratorEnabled.mockReturnValue(true);
    enqueue.mockResolvedValue("job-99");
    getAgentOrchestrator.mockReturnValue({ enqueue, coordinate });
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/saas/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "ceo_supervisor", payload: { x: 1 } }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.jobId).toBe("job-99");
    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        agentId: "ceo_supervisor",
        payload: { x: 1 },
      }),
    );
  });
});
