import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  ContenidoCopywritingPremiumAgent,
  EmailMarketingPremiumAgent,
  FotografiaProductoPremiumAgent,
  OsAgentError,
  OsEventBus,
  OsJobStore,
  TresDInmersivoPremiumAgent,
  VideoMultimediaPremiumAgent,
  instantiateOsAgent,
  type BaseOsAgent,
  type ILlmClient,
} from "@nelvyon/os-agents";

const DEFAULT_STEP_NAMES = ["analysis", "strategy", "execution", "optimization", "qa", "report"] as const;
const ARTIFACT_STEPS_BY_SERVICE: Partial<Record<string, readonly string[]>> = {
  email_marketing_premium: ["html_codegen", "bundle_publish"],
  contenido_copywriting_premium: ["content_codegen", "bundle_publish"],
};
const GENERATIVE_STEP_BY_SERVICE: Partial<Record<string, string>> = {
  video_multimedia_premium: "generate_video",
  "3d_contenido_inmersivo_premium": "generate_3d",
  fotografia_producto_premium: "generate_images",
};

const mockEmailPublish = vi.fn().mockResolvedValue({
  assetId: "test-asset",
  downloadUrl: "http://localhost:3000/api/os/email-bundle/job-test",
  fileCount: 2,
  sizeBytes: 1024,
});

const mockContentPublish = vi.fn().mockResolvedValue({
  assetId: "test-asset",
  downloadUrl: "http://localhost:3000/api/os/content-bundle/job-test",
  fileCount: 5,
  sizeBytes: 2048,
});

const payload = {
  brief: "Proyecto demo OS Lote 2",
  clientName: "Lote2 Test Co",
  industry: "Retail",
  targetAudience: "Urban millennials",
  tone: "profesional",
  competitors: ["Comp A", "Comp B"],
  primaryColor: "#111111",
  secondaryColor: "#222222",
  referenceUrls: ["https://example.com"],
};

type Lote2Case = {
  label: string;
  create: (llm: ILlmClient) => BaseOsAgent;
  serviceId: string;
  AgentClass: new (llm?: ILlmClient) => BaseOsAgent;
};

const AGENTS: Lote2Case[] = [
  {
    label: "email_marketing",
    create: (llm) => new EmailMarketingPremiumAgent(llm, mockEmailPublish),
    serviceId: "email_marketing_premium",
    AgentClass: EmailMarketingPremiumAgent,
  },
  {
    label: "contenido_copywriting",
    create: (llm) => new ContenidoCopywritingPremiumAgent(llm, mockContentPublish),
    serviceId: "contenido_copywriting_premium",
    AgentClass: ContenidoCopywritingPremiumAgent,
  },
  {
    label: "video_multimedia",
    create: (llm) => new VideoMultimediaPremiumAgent(llm),
    serviceId: "video_multimedia_premium",
    AgentClass: VideoMultimediaPremiumAgent,
  },
  {
    label: "3d_inmersivo",
    create: (llm) => new TresDInmersivoPremiumAgent(llm),
    serviceId: "3d_contenido_inmersivo_premium",
    AgentClass: TresDInmersivoPremiumAgent,
  },
  {
    label: "fotografia_producto",
    create: (llm) => new FotografiaProductoPremiumAgent(llm),
    serviceId: "fotografia_producto_premium",
    AgentClass: FotografiaProductoPremiumAgent,
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

describe("agents Lote 2 (elite, mocked LLM)", () => {
  beforeAll(() => {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      process.env.OPENAI_API_KEY = "sk-test-placeholder-os-agents-lote2";
    }
  });

  for (const spec of AGENTS) {
    describe(spec.label, () => {
      it("se instancia y coincide con el registro OS", () => {
        const complete = vi.fn().mockResolvedValue("{}");
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        expect(agent).toBeInstanceOf(spec.AgentClass);
        expect(agent.serviceId).toBe(spec.serviceId);

        const fromRegistry = instantiateOsAgent(spec.serviceId);
        expect(fromRegistry).not.toBeNull();
        expect(fromRegistry).toBeInstanceOf(spec.AgentClass);
        expect(fromRegistry?.serviceId).toBe(spec.serviceId);
      });

      it("tiene los steps esperados (LLM + artefactos opcionales)", () => {
        const complete = vi.fn().mockResolvedValue("{}");
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        const generativeStep = GENERATIVE_STEP_BY_SERVICE[spec.serviceId];
        const artifactSteps = ARTIFACT_STEPS_BY_SERVICE[spec.serviceId] ?? [];
        const expectedNames = [
          ...DEFAULT_STEP_NAMES,
          ...artifactSteps,
          ...(generativeStep ? [generativeStep] : []),
        ];
        expect(agent.steps).toHaveLength(expectedNames.length);
        expect(agent.steps.map((s) => s.name)).toEqual(expectedNames);
      });

      it("execute() con mock LLM completa sin errores", async () => {
        const complete = vi.fn().mockResolvedValue("Elite response mock");
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        const store = new OsJobStore();
        const bus = new OsEventBus();
        const job = await store.createJob({
          serviceId: spec.serviceId,
          clientId: `c_l2_${spec.label}`,
          steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
        });
        await store.updateJobStatus(job.jobId, "running");

        const result = await agent.execute(payload, makeCtx(store, bus, job.jobId, job.clientId, spec.serviceId));

        expect(complete).toHaveBeenCalledTimes(6);
        expect(result.steps).toHaveLength(agent.steps.length);
        const read = await store.getJob(job.jobId);
        expect(read?.status).toBe("completed");
        expect(read?.progress).toBe(100);
      });

      it("el prompt del step report incluye la línea de cierre NELVYON OS", async () => {
        const complete = vi.fn().mockResolvedValue("Elite response mock");
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        const store = new OsJobStore();
        const bus = new OsEventBus();
        const job = await store.createJob({
          serviceId: spec.serviceId,
          clientId: `c_rep_${spec.label}`,
          steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
        });
        await store.updateJobStatus(job.jobId, "running");

        await agent.execute(payload, makeCtx(store, bus, job.jobId, job.clientId, spec.serviceId));

        const reportCall = complete.mock.calls[5]?.[0];
        expect(typeof reportCall).toBe("string");
        expect(String(reportCall)).toContain("Ejecutado por NELVYON OS");
      });

      it("si LlmClient lanza error, propagate OsAgentError", async () => {
        const complete = vi.fn().mockRejectedValueOnce(new Error("LLM sim failure"));
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        const store = new OsJobStore();
        const bus = new OsEventBus();
        const job = await store.createJob({
          serviceId: spec.serviceId,
          clientId: `c_err_${spec.label}`,
          steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
        });
        await store.updateJobStatus(job.jobId, "running");

        await expect(
          agent.execute(payload, makeCtx(store, bus, job.jobId, job.clientId, spec.serviceId)),
        ).rejects.toThrow(OsAgentError);

        const read = await store.getJob(job.jobId);
        expect(read?.status).toBe("failed");
        expect(read?.error?.step).toBe("analysis");
      });
    });
  }
});
