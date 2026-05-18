/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as webStaticBuilder from "../../../../../backend/os-agents/agents/webStaticBuilder";
import { OsEventBus, OsJobStore, OsOrchestrator, resetLlmClientSingletonForTests } from "@nelvyon/os-agents";

describe("OsOrchestrator", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.spyOn(webStaticBuilder, "publishStaticSiteZip").mockResolvedValue({
      assetId: "00000000-0000-4000-8000-000000000001",
      downloadUrl: "http://localhost:3000/api/os/static-site/job",
      fileCount: 6,
      sizeBytes: 2048,
    });
    resetLlmClientSingletonForTests();
    const openAiBody = JSON.stringify({
      choices: [{ message: { content: "{}" } }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => openAiBody,
      }),
    );
  });

  afterEach(() => {
    resetLlmClientSingletonForTests();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("dispatch with valid serviceId creates a job and completes", async () => {
    const store = new OsJobStore();
    const bus = new OsEventBus();
    const orch = new OsOrchestrator(store, bus);

    const out = await orch.dispatch({
      serviceId: "web_premium",
      clientId: "client_test",
      payload: { brief: "stub" },
    });

    expect(out.jobId.length).toBeGreaterThan(4);
    expect(out.status).toBe("completed");
    expect(out.result?.steps).toHaveLength(8);

    const job = await store.getJob(out.jobId);
    expect(job?.status).toBe("completed");
    expect(job?.progress).toBe(100);
    expect(job?.steps.every((s) => s.status === "completed")).toBe(true);
  });
});
