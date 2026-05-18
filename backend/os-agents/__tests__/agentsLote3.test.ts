import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  ConsultoriaAutomatizacionPremiumAgent,
  DisenoGraficoPremiumAgent,
  IntegracionesApisPremiumAgent,
  MantenimientoWebPremiumAgent,
  OsAgentError,
  OsEventBus,
  OsJobStore,
  ReputacionOrmPremiumAgent,
  instantiateOsAgent,
  type BaseOsAgent,
  type ILlmClient,
} from "@nelvyon/os-agents";

const EXPECTED_STEP_NAMES = ["analysis", "strategy", "execution", "optimization", "qa", "report"] as const;

const payload = {
  brief: "Proyecto demo OS Lote 3",
  clientName: "Lote3 Test Co",
  industry: "Retail",
  targetAudience: "Urban millennials",
  tone: "profesional",
  competitors: ["Comp A", "Comp B"],
  primaryColor: "#111111",
  secondaryColor: "#222222",
  referenceUrls: ["https://example.com"],
};

type Lote3Case = {
  label: string;
  create: (llm: ILlmClient) => BaseOsAgent;
  serviceId: string;
  AgentClass: new (llm?: ILlmClient) => BaseOsAgent;
};

const AGENTS: Lote3Case[] = [
  {
    label: "diseno_grafico",
    create: (llm) => new DisenoGraficoPremiumAgent(llm),
    serviceId: "diseno_grafico_creatividades_premium",
    AgentClass: DisenoGraficoPremiumAgent,
  },
  {
    label: "consultoria_automatizacion",
    create: (llm) => new ConsultoriaAutomatizacionPremiumAgent(llm),
    serviceId: "consultoria_automatizacion_premium",
    AgentClass: ConsultoriaAutomatizacionPremiumAgent,
  },
  {
    label: "integraciones_apis",
    create: (llm) => new IntegracionesApisPremiumAgent(llm),
    serviceId: "integraciones_apis_premium",
    AgentClass: IntegracionesApisPremiumAgent,
  },
  {
    label: "mantenimiento_web",
    create: (llm) => new MantenimientoWebPremiumAgent(llm),
    serviceId: "mantenimiento_web_premium",
    AgentClass: MantenimientoWebPremiumAgent,
  },
  {
    label: "reputacion_orm",
    create: (llm) => new ReputacionOrmPremiumAgent(llm),
    serviceId: "reputacion_online_orm_premium",
    AgentClass: ReputacionOrmPremiumAgent,
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

describe("agents Lote 3 (elite, mocked LLM)", () => {
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

      it("tiene exactamente 6 steps con nombres esperados", () => {
        const complete = vi.fn().mockResolvedValue("{}");
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        expect(agent.steps).toHaveLength(6);
        expect(agent.steps.map((s) => s.name)).toEqual([...EXPECTED_STEP_NAMES]);
      });

      it("execute() con mock LLM completa sin errores", async () => {
        const complete = vi.fn().mockResolvedValue("Elite response mock");
        const llm: ILlmClient = { complete };
        const agent = spec.create(llm);
        const store = new OsJobStore();
        const bus = new OsEventBus();
        const job = await store.createJob({
          serviceId: spec.serviceId,
          clientId: `c_l3_${spec.label}`,
          steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
        });
        await store.updateJobStatus(job.jobId, "running");

        const result = await agent.execute(payload, makeCtx(store, bus, job.jobId, job.clientId, spec.serviceId));

        expect(complete).toHaveBeenCalledTimes(6);
        expect(result.steps).toHaveLength(6);
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
