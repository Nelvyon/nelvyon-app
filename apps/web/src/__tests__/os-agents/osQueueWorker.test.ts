import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OsEventBus, OsJobStore, OsQueue, OsQueueWorker, resetOsQueueWorkerForTests } from "@nelvyon/os-agents";
import type { OsJob, OsOrchestrator, OsQueueItem } from "@nelvyon/os-agents";

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}

async function sleepReal(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

describe("OsQueueWorker", () => {
  beforeEach(async () => {
    await resetOsQueueWorkerForTests();
    vi.unstubAllEnvs();
  });

  afterEach(async () => {
    await resetOsQueueWorkerForTests();
  });

  it("a) start runs loop and dequeue is invoked repeatedly when queue stays empty", async () => {
    vi.stubEnv("WORKER_POLL_MS", "40");
    const dequeue = vi.fn().mockResolvedValue(null);
    const queue = {
      enqueue: vi.fn(),
      dequeue,
      size: vi.fn().mockResolvedValue(0),
      peek: vi.fn().mockResolvedValue(null),
    } as unknown as OsQueue;
    const store = { listJobs: vi.fn().mockResolvedValue([]) } as unknown as OsJobStore;
    const bus = new OsEventBus();
    const orchestrator = { processQueuedJob: vi.fn() } as unknown as OsOrchestrator;

    OsQueueWorker.getInstance({ jobStore: store, eventBus: bus, queue, orchestrator }).start();
    await sleepReal(130);
    expect(dequeue.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("b) queued item triggers processQueuedJob with matching params", async () => {
    const queue = new OsQueue(null);
    const store = new OsJobStore();
    const bus = new OsEventBus();
    const item: OsQueueItem = {
      jobId: "os_job_b",
      serviceId: "web_premium",
      clientId: "c_test",
      payload: { brief: "hello" },
      enqueuedAt: new Date().toISOString(),
    };
    await queue.enqueue(item);
    const processQueuedJob = vi.fn().mockResolvedValue({
      jobId: item.jobId,
      status: "completed",
      message: "ok",
    });
    const orchestrator = { processQueuedJob } as unknown as OsOrchestrator;
    OsQueueWorker.getInstance({ jobStore: store, eventBus: bus, queue, orchestrator }).start();
    await flushMicrotasks();
    await vi.waitFor(() => expect(processQueuedJob).toHaveBeenCalled());
    expect(processQueuedJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: item.jobId,
        serviceId: item.serviceId,
        clientId: item.clientId,
        payload: item.payload,
      }),
    );
  });

  it("c) processQueuedJob rejection increments failed and loop continues", async () => {
    const queue = new OsQueue(null);
    const store = new OsJobStore();
    const bus = new OsEventBus();
    const processQueuedJob = vi.fn().mockRejectedValue(new Error("boom"));
    const orchestrator = { processQueuedJob } as unknown as OsOrchestrator;
    await queue.enqueue({
      jobId: "os_job_c",
      serviceId: "web_premium",
      clientId: "c1",
      payload: {},
      enqueuedAt: new Date().toISOString(),
    });
    const worker = OsQueueWorker.getInstance({ jobStore: store, eventBus: bus, queue, orchestrator });
    worker.start();
    await flushMicrotasks();
    await vi.waitFor(() => expect(processQueuedJob).toHaveBeenCalled());
    expect(worker.getStatus().failed).toBeGreaterThanOrEqual(1);
  });

  it("d) stop waits for in-flight job", async () => {
    const queue = new OsQueue(null);
    const store = new OsJobStore();
    const bus = new OsEventBus();
    let finish!: () => void;
    const gate = new Promise<void>((r) => {
      finish = r;
    });
    const processQueuedJob = vi.fn().mockImplementation(async () => {
      await gate;
      return { jobId: "os_job_d", status: "completed" as const, message: "ok" };
    });
    const orchestrator = { processQueuedJob } as unknown as OsOrchestrator;
    await queue.enqueue({
      jobId: "os_job_d",
      serviceId: "web_premium",
      clientId: "c1",
      payload: {},
      enqueuedAt: new Date().toISOString(),
    });
    const worker = OsQueueWorker.getInstance({ jobStore: store, eventBus: bus, queue, orchestrator });
    worker.start();
    await flushMicrotasks();
    await vi.waitFor(() => expect(processQueuedJob).toHaveBeenCalled());
    const stopP = worker.stop();
    await flushMicrotasks();
    finish();
    await stopP;
    expect(worker.getStatus().running).toBe(false);
  });

  it("e) MAX_CONCURRENT_JOBS=1 serializes overlapping work", async () => {
    vi.stubEnv("MAX_CONCURRENT_JOBS", "1");
    const queue = new OsQueue(null);
    const store = new OsJobStore();
    const bus = new OsEventBus();
    const order: string[] = [];
    const processQueuedJob = vi.fn().mockImplementation(async (jobItem: OsQueueItem) => {
      order.push(`start-${jobItem.jobId}`);
      await new Promise((r) => setTimeout(r, 15));
      order.push(`end-${jobItem.jobId}`);
      return { jobId: jobItem.jobId, status: "completed" as const, message: "ok" };
    });
    const orchestrator = { processQueuedJob } as unknown as OsOrchestrator;
    const t = new Date().toISOString();
    await queue.enqueue({ jobId: "os_e1", serviceId: "web_premium", clientId: "c", payload: {}, enqueuedAt: t });
    await queue.enqueue({ jobId: "os_e2", serviceId: "web_premium", clientId: "c", payload: {}, enqueuedAt: t });
    OsQueueWorker.getInstance({ jobStore: store, eventBus: bus, queue, orchestrator }).start();
    await vi.waitFor(() => expect(processQueuedJob).toHaveBeenCalledTimes(2), { timeout: 5000 });
    const e1 = order.indexOf("end-os_e1");
    const s2 = order.indexOf("start-os_e2");
    expect(e1).toBeGreaterThanOrEqual(0);
    expect(s2).toBeGreaterThanOrEqual(0);
    expect(s2).toBeGreaterThan(e1);
  });

  it("f) recovery on start re-enqueues queued and fails running jobs", async () => {
    const enqueueSpy = vi.fn().mockResolvedValue(undefined);
    const failSpy = vi.fn().mockResolvedValue(undefined);
    const queue = { enqueue: enqueueSpy, dequeue: vi.fn().mockResolvedValue(null), size: vi.fn(), peek: vi.fn() } as unknown as OsQueue;
    const store = {
      listJobs: vi.fn().mockResolvedValue([
        {
          jobId: "os_q",
          serviceId: "web_premium",
          clientId: "c1",
          status: "queued",
          progress: 0,
          steps: [],
          payload: { a: 1 },
          createdAt: "2026-05-04T10:00:00.000Z",
          updatedAt: "2026-05-04T10:00:00.000Z",
        } satisfies OsJob,
        {
          jobId: "os_r",
          serviceId: "web_premium",
          clientId: "c1",
          status: "running",
          progress: 5,
          steps: [],
          payload: {},
          createdAt: "2026-05-04T10:00:00.000Z",
          updatedAt: "2026-05-04T10:00:00.000Z",
        } satisfies OsJob,
      ]),
      failJob: failSpy,
      getJob: vi.fn(),
    } as unknown as OsJobStore;
    const bus = new OsEventBus();
    const emitSpy = vi.spyOn(bus, "emit");
    const orchestrator = { processQueuedJob: vi.fn() } as unknown as OsOrchestrator;
    OsQueueWorker.getInstance({ jobStore: store, eventBus: bus, queue, orchestrator }).start();
    await vi.waitFor(() => expect(enqueueSpy).toHaveBeenCalled());
    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "os_q", payload: { a: 1 }, serviceId: "web_premium", clientId: "c1" }),
    );
    expect(failSpy).toHaveBeenCalledWith("os_r", "Server restart — job interrupted", undefined);
    expect(emitSpy).toHaveBeenCalledWith(
      "job:failed",
      expect.objectContaining({
        jobId: "os_r",
        error: expect.objectContaining({ message: "Server restart — job interrupted" }),
      }),
    );
  });
});
