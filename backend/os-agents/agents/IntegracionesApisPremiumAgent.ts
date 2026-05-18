import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptIntegracionesApisAnalysis,
  promptIntegracionesApisExecution,
  promptIntegracionesApisOptimization,
  promptIntegracionesApisQa,
  promptIntegracionesApisReport,
  promptIntegracionesApisStrategy,
} from "./integracionesApisPremiumPrompts";

const S1 = "analysis";
const S2 = "strategy";
const S3 = "execution";
const S4 = "optimization";
const S5 = "qa";
const S6 = "report";

function stepResult(ctx: OsJobContext, name: string): string {
  return ctx.stepResults[name] ?? "";
}

function summarize(text: string, max = 1200): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function buildSteps(llm: ILlmClient): OsAgentStep[] {
  return [
    {
      name: S1,
      description: "Ecosistema y gaps de integración (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptIntegracionesApisAnalysis(payload)),
    },
    {
      name: S2,
      description: "Arquitectura API, webhooks, auth (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S2, promptIntegracionesApisStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Especificaciones 5 integraciones (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, promptIntegracionesApisExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Caching, retry, circuit breakers (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptIntegracionesApisOptimization(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            payload,
          ),
        ),
    },
    {
      name: S5,
      description: "QA contratos y seguridad tokens (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptIntegracionesApisQa(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            stepResult(ctx, S4),
            payload,
          ),
        ),
    },
    {
      name: S6,
      description: "Report plazo e impacto (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptIntegracionesApisReport(
            payload,
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            summarize(stepResult(ctx, S3)),
            summarize(stepResult(ctx, S4)),
            stepResult(ctx, S5),
          ),
        ),
    },
  ];
}

export class IntegracionesApisPremiumAgent extends BaseOsAgent {
  readonly serviceId = "integraciones_apis_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
