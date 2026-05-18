import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  AdvisorEmpresarialPremiumAgent,
  BotsPremiumAgent,
  ComunicacionesPremiumAgent,
  FormacionCapacitacionPremiumAgent,
  InfluencerMarketingPremiumAgent,
  OsAgentError,
  OsEventBus,
  OsJobStore,
  PersonalDigitalPremiumAgent,
  VozPremiumAgent,
  instantiateOsAgent,
  type BaseOsAgent,
  type ILlmClient,
} from "@nelvyon/os-agents";

const DEFAULT_STEP_NAMES = ["analysis", "strategy", "execution", "optimization", "qa", "report"] as const;
const GENERATIVE_STEP_BY_SERVICE: Partial<Record<string, string>> = {
  voz_premium: "generate_voice",
};

const payload = {
  brief: "Proyecto demo OS Lote 4",
  clientName: "Lote4 Test Co",
  industry: "Retail",
  targetAudience: "Urban millennials",
  tone: "profesional",
  competitors: ["Comp A", "Comp B"],
  primaryColor: "#111111",
  secondaryColor: "#222222",
  referenceUrls: ["https://example.com"],
};

type Lote4Case = {
  label: string;
  create: (llm: ILlmClient) => BaseOsAgent;
  serviceId: string;
  AgentClass: new (llm?: ILlmClient) => BaseOsAgent;
};

const AGENTS: Lote4Case[] = [
  {
    label: "formacion_capacitacion",
    create: (llm) => new FormacionCapacitacionPremiumAgent(llm),
    serviceId: "formacion_capacitacion_digital_premium",
    AgentClass: FormacionCapacitacionPremiumAgent,
  },
  {
    label: "influencer_marketing",
    create: (llm) => new InfluencerMarketingPremiumAgent(llm),
    serviceId: "influencer_marketing_premium",
    AgentClass: InfluencerMarketingPremiumAgent,
  },
  {
    label: "voz",
    create: (llm) => new VozPremiumAgent(llm),
    serviceId: "voz_premium",
    AgentClass: VozPremiumAgent,
  },
  {
    label: "bots",
    create: (llm) => new BotsPremiumAgent(llm),
    serviceId: "bots_premium",
    AgentClass: BotsPremiumAgent,
  },
  {
    label: "personal_digital",
    create: (llm) => new PersonalDigitalPremiumAgent(llm),
    serviceId: "personal_digital_premium",
    AgentClass: PersonalDigitalPremiumAgent,
  },
  {
    label: "advisor_empresarial",
    create: (llm) => new AdvisorEmpresarialPremiumAgent(llm),
    serviceId: "advisor_empresarial_premium",
    AgentClass: AdvisorEmpresarialPremiumAgent,
  },
  {
    label: "canales_comunicaciones",
    create: (llm) => new ComunicacionesPremiumAgent(llm),
    serviceId: "canales_comunicaciones_premium",
    AgentClass: ComunicacionesPremiumAgent,
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

describe("agents Lote 4 (elite, mocked LLM)", () => {
  beforeAll(() => {
    process.env.OPENAI_API_KEY = "sk-test-dummy";
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

      it("tiene exactly steps esperados", () => {
        const complete = vi.fn().mockResolvedValue("{}");
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        const generativeStep = GENERATIVE_STEP_BY_SERVICE[spec.serviceId];
        const expectedNames = generativeStep ? [...DEFAULT_STEP_NAMES, generativeStep] : [...DEFAULT_STEP_NAMES];
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
          clientId: `c_l4_${spec.label}`,
          steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
        });
        await store.updateJobStatus(job.jobId, "running");

        const result = await agent.execute(payload, makeCtx(store, bus, job.jobId, job.clientId, spec.serviceId));

        expect(complete).toHaveBeenCalledTimes(6);
        const expectedStepCount = GENERATIVE_STEP_BY_SERVICE[spec.serviceId] ? 7 : 6;
        expect(result.steps).toHaveLength(expectedStepCount);
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
