// @ts-nocheck
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

vi.mock("../../os-agents/OsOrchestrator", () => ({
  osOrchestrator: {
    enqueueAndDispatch: (...args: unknown[]) => enqueueAndDispatchMock(...args),
    processQueuedJob: (...args: unknown[]) => processQueuedJobMock(...args),
  },
}));

import { QueueClient } from "../queueClient";
import { startOsWorker, stopOsWorker } from "../osWorker";

describe("QueueClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    QueueClient.resetForTests();
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.ASYNC_QUEUE_ENABLED = "true";
    enqueueAndDispatchMock.mockResolvedValue({
      jobId: "os_user-1_abc-123",
      status: "queued",
      message: "ok",
    });
  });

  afterEach(async () => {
    await stopOsWorker();
    QueueClient.resetForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("enqueue retorna jobId válido y encola en Redis", async () => {
    const client = QueueClient.getInstance();
    const jobId = await client.enqueue({
      userId: "user-1",
      clientId: "tenant-1",
      serviceId: "web_premium",
      payload: { brief: "test" },
    });

    expect(jobId).toMatch(/^os_user-1_/);
    expect(enqueueAndDispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        serviceId: "web_premium",
        jobId: expect.stringMatching(/^os_user-1_/),
      }),
      { skipQueue: true },
    );
    expect(redisMock.lpush).toHaveBeenCalled();
    expect(redisMock.set).toHaveBeenCalled();
  });

  it("getJobStatus devuelve pending inicialmente", async () => {
    redisMock.get.mockResolvedValueOnce({
      status: "pending",
      userId: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const status = await QueueClient.getInstance().getJobStatus("os_user-1_x");
    expect(status?.status).toBe("pending");
  });

  it("setJobResult marca completed con resultado", async () => {
    redisMock.get.mockResolvedValue({
      status: "processing",
      userId: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const client = QueueClient.getInstance();
    await client.setJobResult("os_user-1_x", { ok: true });

    expect(redisMock.set).toHaveBeenCalledWith(
      "os:async:job:os_user-1_x",
      expect.objectContaining({ status: "completed", result: { ok: true } }),
      { ex: 86400 },
    );
  });

  it("fail-open en memoria cuando no hay Upstash configurado", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_TOKEN;
    QueueClient.resetForTests();
    enqueueAndDispatchMock.mockResolvedValueOnce({
      jobId: "os_user-2_mem-job",
      status: "queued",
      message: "ok",
    });

    const jobId = await QueueClient.getInstance().enqueue({
      userId: "user-2",
      clientId: "tenant-2",
      serviceId: "web_premium",
      payload: {},
    });

    expect(jobId).toBe("os_user-2_mem-job");
    const status = await QueueClient.getInstance().getJobStatus(jobId);
    expect(status?.status).toBe("pending");
  });

  it("setJobFailed marca failed con error", async () => {
    redisMock.get.mockResolvedValue({
      status: "processing",
      userId: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await QueueClient.getInstance().setJobFailed("os_user-1_x", "boom");

    expect(redisMock.set).toHaveBeenCalledWith(
      "os:async:job:os_user-1_x",
      expect.objectContaining({ status: "failed", error: "boom" }),
      { ex: 86400 },
    );
  });
});

describe("osWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    QueueClient.resetForTests();
    process.env.MAX_CONCURRENT_JOBS = "1";
    process.env.WORKER_POLL_MS = "50";
    enqueueAndDispatchMock.mockResolvedValue({
      jobId: "os_user-1_job-1",
      status: "queued",
      message: "ok",
    });
    processQueuedJobMock.mockResolvedValue({
      jobId: "os_user-1_job-1",
      status: "completed",
      message: "done",
      result: { steps: [] },
    });
  });

  afterEach(async () => {
    await stopOsWorker();
    QueueClient.resetForTests();
  });

  it("procesa job de la cola y llama OsOrchestrator.processQueuedJob", async () => {
    const item = {
      jobId: "os_user-1_job-1",
      serviceId: "web_premium",
      clientId: "tenant-1",
      payload: {},
      userId: "user-1",
      enqueuedAt: new Date().toISOString(),
    };

    redisMock.rpop.mockResolvedValueOnce(JSON.stringify(item));
    redisMock.get.mockResolvedValue({
      status: "pending",
      userId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    startOsWorker();
    await vi.waitFor(() => expect(processQueuedJobMock).toHaveBeenCalled(), { timeout: 3000 });
    expect(processQueuedJobMock).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "os_user-1_job-1", userId: "user-1" }),
    );
  });

  it("respeta concurrencia máxima (no más de MAX_CONCURRENT procesos paralelos)", async () => {
    await stopOsWorker();
    process.env.MAX_CONCURRENT_JOBS = "1";
    process.env.WORKER_POLL_MS = "30";

    let active = 0;
    let maxActive = 0;

    processQueuedJobMock.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 120));
      active--;
      return { jobId: "j", status: "completed", message: "ok" };
    });

    const item = {
      jobId: "os_user-1_job-2",
      serviceId: "web_premium",
      clientId: "tenant-1",
      payload: {},
      userId: "user-1",
      enqueuedAt: new Date().toISOString(),
    };

    redisMock.rpop
      .mockResolvedValueOnce(JSON.stringify(item))
      .mockResolvedValueOnce(JSON.stringify({ ...item, jobId: "os_user-1_job-3" }))
      .mockResolvedValue(null);
    redisMock.get.mockResolvedValue({
      status: "pending",
      userId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    startOsWorker();
    await new Promise((r) => setTimeout(r, 400));
    await stopOsWorker();
    expect(maxActive).toBeLessThanOrEqual(1);
  });
});
