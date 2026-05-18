import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = {
  lpush: vi.fn().mockResolvedValue(1),
  rpop: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue("OK"),
  get: vi.fn().mockResolvedValue(null),
  expire: vi.fn().mockResolvedValue(1),
};

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(() => redisMock),
}));

const enqueueAndDispatchMock = vi.fn();
const processQueuedJobMock = vi.fn();

vi.mock("../../../os-agents/OsOrchestrator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../os-agents/OsOrchestrator")>();
  return {
    ...actual,
    osOrchestrator: {
      ...actual.osOrchestrator,
      enqueueAndDispatch: (...args: unknown[]) => enqueueAndDispatchMock(...args),
      processQueuedJob: (...args: unknown[]) => processQueuedJobMock(...args),
    },
  };
});

vi.mock("../../../logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("../../../usage/rateLimiter", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(undefined),
  RateLimitExceededError: class RateLimitExceededError extends Error {
    constructor(
      public readonly plan: string,
      public readonly limit: number,
    ) {
      super("rate limit");
      this.name = "RateLimitExceededError";
    }
  },
}));

vi.mock("../../../os-agents/OsAgentRegistry", () => ({
  instantiateOsAgent: () => ({
    steps: [{ name: "step-1", description: "Paso 1" }],
    execute: vi.fn().mockResolvedValue({ serviceId: "web_premium", steps: [] }),
  }),
}));

import { QueueClient } from "../../../queue/queueClient";

describe("flow: agent — job encolado → worker → resultado → notificación", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "sk-test-flow");
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.ASYNC_QUEUE_ENABLED = "true";
    QueueClient.resetForTests();
    enqueueAndDispatchMock.mockResolvedValue({
      jobId: "os_user-1_flow-job",
      status: "queued",
      message: "Job queued for background processing.",
    });
    processQueuedJobMock.mockResolvedValue({
      jobId: "os_user-1_flow-job",
      status: "completed",
      message: "OS job completed successfully.",
      result: { output: "ok" },
    });
  });

  afterEach(() => {
    QueueClient.resetForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.unstubAllEnvs();
  });

  describe("QueueClient", () => {

    it("enqueue devuelve job_id y status queued", async () => {
      const jobId = await QueueClient.getInstance().enqueue({
        userId: "user-1",
        clientId: "tenant-1",
        serviceId: "web_premium",
        payload: { brief: "test" },
      });

      expect(jobId).toBe("os_user-1_flow-job");
      expect(enqueueAndDispatchMock).toHaveBeenCalled();
    });

    it("worker procesa: pending → processing → completed", async () => {
      const base = {
        userId: "user-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      redisMock.get
        .mockResolvedValueOnce({ ...base, status: "pending" })
        .mockResolvedValueOnce({ ...base, status: "processing" });

      const client = QueueClient.getInstance();
      await client.setJobStatus("os_user-1_flow-job", "processing");
      await client.setJobResult("os_user-1_flow-job", { ok: true });

      const completedCall = redisMock.set.mock.calls.find(
        ([, record]) =>
          typeof record === "object" &&
          record !== null &&
          (record as { status?: string }).status === "completed",
      );
      expect(completedCall).toBeDefined();
      expect(completedCall![1]).toMatchObject({ status: "completed", result: { ok: true } });
    });

    it("worker falla: status failed con error reintentable", async () => {
      redisMock.get.mockResolvedValue({
        status: "processing",
        userId: "user-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });

      await QueueClient.getInstance().setJobFailed("os_user-1_flow-job", "LLM timeout");

      expect(redisMock.set).toHaveBeenCalledWith(
        "os:async:job:os_user-1_flow-job",
        expect.objectContaining({ status: "failed", error: "LLM timeout" }),
        { ex: 86400 },
      );
    });

    it("timeout: job marcado failed tras error de timeout", async () => {
      redisMock.get.mockResolvedValue({
        status: "processing",
        userId: "user-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });

      await QueueClient.getInstance().setJobFailed("os_user-1_flow-job", "Job timed out after 600s");

      const lastSet = redisMock.set.mock.calls.at(-1)!;
      expect(lastSet[1]).toMatchObject({
        status: "failed",
        error: expect.stringContaining("timed out"),
      });
    });
  });

  describe("OsOrchestrator + OsJobStore", () => {
    it("resultado guardado en job store con output correcto", async () => {
      const { OsJobStore } = await import("../../../os-agents/OsJobStore");
      const store = new OsJobStore();

      await store.createJob({
        jobId: "os_result_test",
        serviceId: "web_premium",
        clientId: "tenant-1",
        steps: [{ name: "deliver", description: "Entrega" }],
        payload: { brief: "x" },
      });
      await store.completeJob("os_result_test", {
        serviceId: "web_premium",
        steps: [{ name: "deliver", data: { content: "result-body" } }],
      });

      const job = await store.getJob("os_result_test");
      expect(job?.status).toBe("completed");
      expect(job?.result?.steps[0]?.data.content).toBe("result-body");
    });

    it("job duplicado en worker: segundo process devuelve skipped si ya no está queued", async () => {
      const { OsJobStore } = await import("../../../os-agents/OsJobStore");
      const { OsEventBus } = await import("../../../os-agents/OsEventBus");
      const { OsOrchestrator } = await import("../../../os-agents/OsOrchestrator");
      const store = new OsJobStore();
      const bus = new OsEventBus();
      const orch = new OsOrchestrator(store, bus);

      await store.createJob({
        jobId: "os_dup_test",
        serviceId: "web_premium",
        clientId: "tenant-1",
        steps: [{ name: "s1", description: "d" }],
        payload: {},
      });
      await store.updateJobStatus("os_dup_test", "completed");

      const second = await orch.processQueuedJob({
        jobId: "os_dup_test",
        serviceId: "web_premium",
        clientId: "tenant-1",
        payload: {},
        userId: "user-1",
        enqueuedAt: "2026-01-01T00:00:00.000Z",
      });

      expect(second.skipped).toBe(true);
      expect(second.status).toBe("completed");
    });

    it("worker falla y persiste error en job store", async () => {
      const { OsJobStore } = await import("../../../os-agents/OsJobStore");
      const store = new OsJobStore();

      await store.createJob({
        jobId: "os_fail_test",
        serviceId: "web_premium",
        clientId: "tenant-1",
        steps: [{ name: "s1", description: "d" }],
        payload: {},
      });

      await store.failJob("os_fail_test", "Agent execution error", undefined);
      const job = await store.getJob("os_fail_test");
      expect(job?.status).toBe("failed");
      expect(job?.error?.message).toContain("execution error");
    });
  });
});
