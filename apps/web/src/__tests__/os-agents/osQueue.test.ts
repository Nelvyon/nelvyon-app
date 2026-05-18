import { describe, expect, it } from "vitest";

import { OsQueue } from "@nelvyon/os-agents";

describe("OsQueue (in-memory)", () => {
  it("a) enqueue + dequeue preserves FIFO order", async () => {
    const q = new OsQueue(null);
    const t = new Date().toISOString();
    await q.enqueue({
      jobId: "a",
      serviceId: "web_premium",
      clientId: "c1",
      payload: { brief: "1" },
      enqueuedAt: t,
    });
    await q.enqueue({
      jobId: "b",
      serviceId: "web_premium",
      clientId: "c1",
      payload: { brief: "2" },
      enqueuedAt: t,
    });
    const first = await q.dequeue();
    const second = await q.dequeue();
    expect(first?.jobId).toBe("a");
    expect(second?.jobId).toBe("b");
  });

  it("b) dequeue on empty queue returns null", async () => {
    const q = new OsQueue(null);
    expect(await q.dequeue()).toBeNull();
  });

  it("c) size tracks enqueue/dequeue", async () => {
    const q = new OsQueue(null);
    const t = new Date().toISOString();
    expect(await q.size()).toBe(0);
    await q.enqueue({
      jobId: "x",
      serviceId: "web_premium",
      clientId: "c1",
      payload: {},
      enqueuedAt: t,
    });
    expect(await q.size()).toBe(1);
    await q.dequeue();
    expect(await q.size()).toBe(0);
  });
});
