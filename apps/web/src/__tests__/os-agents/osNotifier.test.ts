import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OsEventBus, getOsJobStore, initOsNotifier, osEventBus, resetOsNotifierForTests } from "@nelvyon/os-agents";
import type { IEmailNotifier, IWsNotifier, OsJobResult, OsNotifierEvent } from "@nelvyon/os-agents";

describe("OsNotifier", () => {
  let bus: OsEventBus;
  let mockWs: IWsNotifier;
  let mockEmail: IEmailNotifier;
  const wsSend = vi.fn();
  const emailSend = vi.fn();

  beforeEach(() => {
    resetOsNotifierForTests();
    bus = new OsEventBus();
    wsSend.mockReset();
    emailSend.mockReset();
    mockWs = {
      registerClient: vi.fn(),
      unregisterClient: vi.fn(),
      send: wsSend,
    };
    mockEmail = {
      send: emailSend,
    };
    initOsNotifier(bus, mockWs, mockEmail);
  });

  afterEach(() => {
    resetOsNotifierForTests();
    initOsNotifier(osEventBus);
  });

  const sampleResult: OsJobResult = {
    serviceId: "web_premium",
    steps: [{ name: "s1", data: { ok: true } }],
  };

  it("job:completed → WsNotifier.send and EmailNotifier.send", async () => {
    const store = getOsJobStore();
    const job = await store.createJob({
      serviceId: "web_premium",
      clientId: "c_done",
      steps: [{ name: "a", description: "d" }],
    });
    bus.emit("job:completed", { jobId: job.jobId, result: sampleResult });
    await vi.waitFor(() => expect(wsSend).toHaveBeenCalledTimes(1));
    expect(emailSend).toHaveBeenCalledTimes(1);
    const ev = wsSend.mock.calls[0]?.[1] as OsNotifierEvent;
    expect(ev.type).toBe("job:completed");
    expect(ev.jobId).toBe(job.jobId);
  });

  it("job:failed → WsNotifier.send and EmailNotifier.send", async () => {
    const store = getOsJobStore();
    const job = await store.createJob({
      serviceId: "web_premium",
      clientId: "c_fail",
      steps: [{ name: "a", description: "d" }],
    });
    bus.emit("job:failed", { jobId: job.jobId, error: { message: "boom", step: "s1" } });
    await vi.waitFor(() => expect(wsSend).toHaveBeenCalledTimes(1));
    expect(emailSend).toHaveBeenCalledTimes(1);
  });

  it("job:progress → only WsNotifier.send", async () => {
    const store = getOsJobStore();
    const job = await store.createJob({
      serviceId: "seo_premium",
      clientId: "c_prog",
      steps: [{ name: "a", description: "d" }],
    });
    bus.emit("job:progress", { jobId: job.jobId, progress: 40, stepName: "x" });
    await vi.waitFor(() => expect(wsSend).toHaveBeenCalledTimes(1));
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("job:created → only WsNotifier.send", () => {
    bus.emit("job:created", { jobId: "j4", serviceId: "web_premium", clientId: "c1" });
    expect(wsSend).toHaveBeenCalledTimes(1);
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("if WsNotifier.send throws, EmailNotifier.send still runs for completed", async () => {
    wsSend.mockImplementation(() => {
      throw new Error("ws down");
    });
    emailSend.mockResolvedValue(undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = getOsJobStore();
    const job = await store.createJob({
      serviceId: "web_premium",
      clientId: "c_res",
      steps: [{ name: "a", description: "d" }],
    });
    bus.emit("job:completed", { jobId: job.jobId, result: sampleResult });
    await vi.waitFor(() => expect(emailSend).toHaveBeenCalledTimes(1));
    warn.mockRestore();
  });
});
