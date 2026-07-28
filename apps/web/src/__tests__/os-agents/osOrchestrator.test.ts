/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as webStaticBuilder from "../../../../../backend/os-agents/agents/webStaticBuilder";
import { OsEventBus, OsJobStore, OsOrchestrator, resetLlmClientSingletonForTests } from "@nelvyon/os-agents";

describe("OsOrchestrator", () => {
  beforeEach(() => {
    // Prefer mocked OpenAI path; clear shell Ollama pollution that fail-closes the OS client.
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("AUTONOMOUS_ALLOW_OPENAI", "1");
    vi.stubEnv("PRIVATE_MODE", "OFF");
    vi.stubEnv("OLLAMA_HOST", "");
    vi.stubEnv("OLLAMA_BASE_URL", "");
    vi.stubEnv("OLLAMA_CONFIGURED", "");
    vi.stubEnv("NELVYON_LOCAL_AI_URL", "");
    vi.stubEnv("LOCAL_AI_BASE_URL", "");
    delete process.env.OLLAMA_HOST;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_CONFIGURED;
    delete process.env.NELVYON_LOCAL_AI_URL;
    delete process.env.LOCAL_AI_BASE_URL;
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
