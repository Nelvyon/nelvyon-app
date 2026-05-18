import { describe, expect, it, vi } from "vitest";

import {
  AdsPremiumAgent,
  BrandingPremiumAgent,
  EcommercePremiumAgent,
  OsEventBus,
  OsJobStore,
  SeoPremiumAgent,
  SocialMediaPremiumAgent,
  type BaseOsAgent,
  type ILlmClient,
} from "@nelvyon/os-agents";

type AgentCase = {
  label: string;
  create: (llm: ILlmClient) => BaseOsAgent;
  serviceId: string;
  /** Second pipeline step (1-based index 2) — failure injection target */
  failStepName: string;
};

const payload = {
  brief: "Proyecto demo OS",
  clientName: "Lote1 Test Co",
  industry: "Retail",
  targetAudience: "Urban millennials",
  tone: "profesional",
  competitors: ["Comp A", "Comp B"],
  primaryColor: "#111111",
  secondaryColor: "#222222",
  referenceUrls: ["https://example.com"],
  targetKeywords: ["seo", "growth"],
  mainGoal: "Leads B2B",
  currentWebsiteUrl: "https://client.example",
  platforms: ["google", "meta"],
  monthlyBudget: 5000,
  campaignGoal: "Leads",
  postFrequency: "semanal",
  contentStyle: "Editorial minimal",
};

const mockAdsPublish = vi.fn().mockResolvedValue({
  assetId: "test-asset",
  downloadUrl: "http://localhost:3000/api/os/ads-bundle/job-test",
  fileCount: 10,
  sizeBytes: 2048,
});

const mockSeoPublish = vi.fn().mockResolvedValue({
  assetId: "test-asset",
  downloadUrl: "http://localhost:3000/api/os/seo-report/job-test",
  fileCount: 3,
  sizeBytes: 2048,
});

const mockSocialPublish = vi.fn().mockResolvedValue({
  assetId: "test-asset",
  downloadUrl: "http://localhost:3000/api/os/social-bundle/job-test",
  fileCount: 14,
  sizeBytes: 4096,
});

const AGENTS: AgentCase[] = [
  { label: "ecommerce", create: (llm) => new EcommercePremiumAgent(llm), serviceId: "ecommerce_premium", failStepName: "store_architecture" },
  {
    label: "seo",
    create: (llm) => new SeoPremiumAgent(llm, mockSeoPublish),
    serviceId: "seo_premium",
    failStepName: "keyword_research",
  },
  {
    label: "ads",
    create: (llm) => new AdsPremiumAgent(llm, mockAdsPublish),
    serviceId: "ads_premium",
    failStepName: "campaign_strategy",
  },
  { label: "branding", create: (llm) => new BrandingPremiumAgent(llm), serviceId: "branding_premium", failStepName: "brand_strategy" },
  {
    label: "social",
    create: (llm) => new SocialMediaPremiumAgent(llm, mockSocialPublish),
    serviceId: "social_media_premium",
    failStepName: "content_strategy",
  },
];

function makeCtx(store: OsJobStore, bus: OsEventBus, jobId: string, clientId: string, serviceId: string) {
  return {
    jobId,
    clientId,
    serviceId,
    payload,
    stepResults: {} as Record<string, string>,
    jobStore: store,
    eventBus: bus,
  };
}

describe("agents Lote 1 (elite, mocked LLM)", () => {
  for (const spec of AGENTS) {
    describe(spec.label, () => {
      it("a) execute completa 6 steps → completed, progress 100", async () => {
        const complete = vi.fn().mockResolvedValue("{}");
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        const store = new OsJobStore();
        const bus = new OsEventBus();
        const job = await store.createJob({
          serviceId: spec.serviceId,
          clientId: `c_${spec.label}`,
          steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
        });
        await store.updateJobStatus(job.jobId, "running");

        const result = await agent.execute(payload, makeCtx(store, bus, job.jobId, job.clientId, spec.serviceId));

        expect(result.steps).toHaveLength(agent.steps.length);
        const read = await store.getJob(job.jobId);
        expect(read?.status).toBe("completed");
        expect(read?.progress).toBe(100);
      });

      it("b) LlmClient.complete llamado exactamente 6 veces", async () => {
        const complete = vi.fn().mockResolvedValue("{}");
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        const store = new OsJobStore();
        const bus = new OsEventBus();
        const job = await store.createJob({
          serviceId: spec.serviceId,
          clientId: `c2_${spec.label}`,
          steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
        });
        await store.updateJobStatus(job.jobId, "running");

        await agent.execute(payload, makeCtx(store, bus, job.jobId, job.clientId, spec.serviceId));

        expect(complete).toHaveBeenCalledTimes(6);
      });

      it("c) fallo en step 2 → failed y error menciona el step", async () => {
        const complete = vi.fn().mockResolvedValueOnce("{}").mockRejectedValueOnce(new Error("LLM sim failure"));
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        const store = new OsJobStore();
        const bus = new OsEventBus();
        const job = await store.createJob({
          serviceId: spec.serviceId,
          clientId: `c3_${spec.label}`,
          steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
        });
        await store.updateJobStatus(job.jobId, "running");

        await expect(
          agent.execute(payload, makeCtx(store, bus, job.jobId, job.clientId, spec.serviceId)),
        ).rejects.toThrow("LLM sim failure");

        const read = await store.getJob(job.jobId);
        expect(read?.status).toBe("failed");
        expect(read?.error?.step).toBe(spec.failStepName);
        expect(read?.error?.message ?? "").toContain(spec.failStepName);
      });
    });
  }
});
