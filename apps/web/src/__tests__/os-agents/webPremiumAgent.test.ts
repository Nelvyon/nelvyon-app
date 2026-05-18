import { describe, expect, it, vi } from "vitest";

import { OsEventBus, OsJobStore, WebPremiumAgent, type ILlmClient } from "@nelvyon/os-agents";

describe("WebPremiumAgent", () => {
  it("execute returns eight completed steps", async () => {
    const llm: ILlmClient = {
      complete: vi.fn().mockResolvedValue("{}"),
    };
    const publishZip = vi.fn().mockResolvedValue({
      assetId: "asset-1",
      downloadUrl: "http://localhost:3000/api/os/static-site/job-1",
      fileCount: 6,
      sizeBytes: 4096,
    });
    const store = new OsJobStore();
    const bus = new OsEventBus();
    const agent = new WebPremiumAgent(llm, publishZip);

    const job = await store.createJob({
      serviceId: agent.serviceId,
      clientId: "c_web",
      steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
    });

    await store.updateJobStatus(job.jobId, "running");

    const result = await agent.execute(
      { title: "Demo", brief: "Sitio corporativo" },
      {
        jobId: job.jobId,
        clientId: job.clientId,
        serviceId: agent.serviceId,
        payload: { title: "Demo", brief: "Sitio corporativo" },
        stepResults: {},
        jobStore: store,
        eventBus: bus,
      },
    );

    expect(result.steps).toHaveLength(8);
    expect(result.steps.map((s) => s.name)).toEqual([
      "brief_analysis",
      "design_proposal",
      "content_generation",
      "seo_setup",
      "qa_checklist",
      "delivery_report",
      "site_codegen",
      "bundle_publish",
    ]);

    const read = await store.getJob(job.jobId);
    expect(read?.status).toBe("completed");
    expect(read?.progress).toBe(100);
    expect(llm.complete).toHaveBeenCalledTimes(6);
  });
});
