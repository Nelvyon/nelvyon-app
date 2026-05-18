import { describe, expect, it, vi } from "vitest";

import { OsEventBus, OsJobStore, WebPremiumAgent, type ILlmClient } from "@nelvyon/os-agents";

const publishZipMock = vi.fn().mockResolvedValue({
  assetId: "asset-1",
  downloadUrl: "http://localhost:3000/api/os/static-site/job-1",
  fileCount: 6,
  sizeBytes: 4096,
});

function makeCtx(store: OsJobStore, bus: OsEventBus, jobId: string, clientId: string, serviceId: string) {
  return {
    jobId,
    clientId,
    serviceId,
    payload: { brief: "Brief de prueba" },
    stepResults: {} as Record<string, string>,
    jobStore: store,
    eventBus: bus,
  };
}

describe("WebPremiumAgent (real pipeline, mocked LLM)", () => {
  const step1Json = JSON.stringify({ objetivo: "lead", audiencia: "B2B" });
  const step2Json = JSON.stringify({ paleta: ["#111111"], layout: "hero+grid" });
  const step3Json = JSON.stringify({
    homepage: {
      heroHeadline: "Hola",
      heroSubheadline: "Sub",
      heroCta: "CTA",
      sections: [],
    },
    about: { headline: "About", story: "Story", values: [] },
    services: [{ name: "S1", headline: "H", description: "D", benefits: ["B"] }],
    contact: { headline: "C", subheadline: "S", cta: "Go" },
  });
  const step4Json = JSON.stringify({ titles: { "/": "Inicio" }, keywords: ["a", "b"] });
  const step5Json = JSON.stringify({ items: Array.from({ length: 20 }, (_, i) => ({ id: i, status: "PASS" })) });
  const step6Md = "# Entrega\n\nListo.";

  it("a) execute completes six steps with progress 100", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(step1Json)
      .mockResolvedValueOnce(step2Json)
      .mockResolvedValueOnce(step3Json)
      .mockResolvedValueOnce(step4Json)
      .mockResolvedValueOnce(step5Json)
      .mockResolvedValueOnce(step6Md);
    const llm: ILlmClient = { complete };
    const store = new OsJobStore();
    const bus = new OsEventBus();
    const agent = new WebPremiumAgent(llm, publishZipMock);
    const job = await store.createJob({
      serviceId: agent.serviceId,
      clientId: "c1",
      steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
    });
    await store.updateJobStatus(job.jobId, "running");

    const result = await agent.execute({ brief: "x" }, makeCtx(store, bus, job.jobId, job.clientId, agent.serviceId));

    expect(result.steps).toHaveLength(8);
    const read = await store.getJob(job.jobId);
    expect(read?.status).toBe("completed");
    expect(read?.progress).toBe(100);
  });

  it("b) each step stores output in context.stepResults", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(step1Json)
      .mockResolvedValueOnce(step2Json)
      .mockResolvedValueOnce(step3Json)
      .mockResolvedValueOnce(step4Json)
      .mockResolvedValueOnce(step5Json)
      .mockResolvedValueOnce(step6Md);
    const llm: ILlmClient = { complete };
    const store = new OsJobStore();
    const bus = new OsEventBus();
    const agent = new WebPremiumAgent(llm, publishZipMock);
    const job = await store.createJob({
      serviceId: agent.serviceId,
      clientId: "c2",
      steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
    });
    await store.updateJobStatus(job.jobId, "running");
    const ctx = makeCtx(store, bus, job.jobId, job.clientId, agent.serviceId);

    await agent.execute({ brief: "x" }, ctx);

    expect(ctx.stepResults.brief_analysis).toBe(step1Json);
    expect(ctx.stepResults.design_proposal).toBe(step2Json);
    expect(ctx.stepResults.content_generation).toBe(step3Json);
    expect(ctx.stepResults.seo_setup).toBe(step4Json);
    expect(ctx.stepResults.qa_checklist).toBe(step5Json);
    expect(ctx.stepResults.delivery_report).toBe(step6Md);
  });

  it("c) delivery_report prompt includes prior step outputs", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(step1Json)
      .mockResolvedValueOnce(step2Json)
      .mockResolvedValueOnce(step3Json)
      .mockResolvedValueOnce(step4Json)
      .mockResolvedValueOnce(step5Json)
      .mockResolvedValueOnce(step6Md);
    const llm: ILlmClient = { complete };
    const store = new OsJobStore();
    const bus = new OsEventBus();
    const agent = new WebPremiumAgent(llm, publishZipMock);
    const job = await store.createJob({
      serviceId: agent.serviceId,
      clientId: "c3",
      steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
    });
    await store.updateJobStatus(job.jobId, "running");

    await agent.execute({ brief: "x" }, makeCtx(store, bus, job.jobId, job.clientId, agent.serviceId));

    expect(complete).toHaveBeenCalledTimes(6);
    const lastPrompt = complete.mock.calls[5][0] as string;
    expect(lastPrompt).toContain(step1Json);
    expect(lastPrompt).toContain(step2Json);
    expect(lastPrompt).toContain(step4Json);
    expect(lastPrompt).toContain(step5Json);
  });

  it("d) failure in content_generation surfaces step name", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(step1Json)
      .mockResolvedValueOnce(step2Json)
      .mockRejectedValueOnce(new Error("LLM timeout"));
    const llm: ILlmClient = { complete };
    const store = new OsJobStore();
    const bus = new OsEventBus();
    const agent = new WebPremiumAgent(llm, publishZipMock);
    const job = await store.createJob({
      serviceId: agent.serviceId,
      clientId: "c4",
      steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
    });
    await store.updateJobStatus(job.jobId, "running");

    await expect(agent.execute({ brief: "x" }, makeCtx(store, bus, job.jobId, job.clientId, agent.serviceId))).rejects.toThrow(
      "LLM timeout",
    );

    const read = await store.getJob(job.jobId);
    expect(read?.status).toBe("failed");
    expect(read?.error?.step).toBe("content_generation");
    expect(read?.error?.message ?? "").toContain("content_generation");
  });

  it("e) LLM complete is invoked exactly six times on full success", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(step1Json)
      .mockResolvedValueOnce(step2Json)
      .mockResolvedValueOnce(step3Json)
      .mockResolvedValueOnce(step4Json)
      .mockResolvedValueOnce(step5Json)
      .mockResolvedValueOnce(step6Md);
    const llm: ILlmClient = { complete };
    const store = new OsJobStore();
    const bus = new OsEventBus();
    const agent = new WebPremiumAgent(llm, publishZipMock);
    const job = await store.createJob({
      serviceId: agent.serviceId,
      clientId: "c5",
      steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
    });
    await store.updateJobStatus(job.jobId, "running");

    await agent.execute({ brief: "x" }, makeCtx(store, bus, job.jobId, job.clientId, agent.serviceId));

    expect(complete).toHaveBeenCalledTimes(6);
  });
});
