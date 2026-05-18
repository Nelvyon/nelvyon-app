import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptComunicacionesAnalysis,
  promptComunicacionesExecution,
  promptComunicacionesOptimization,
  promptComunicacionesQa,
  promptComunicacionesReport,
  promptComunicacionesStrategy,
} from "./comunicacionesPremiumPrompts";

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
      description: "Auditoría omnicanal (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptComunicacionesAnalysis(payload)),
    },
    {
      name: S2,
      description: "Arquitectura de canales (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S2, promptComunicacionesStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Calendario 90d y plantillas (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S3,
          promptComunicacionesExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload),
        ),
    },
    {
      name: S4,
      description: "Orquestación y A/B (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptComunicacionesOptimization(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            payload,
          ),
        ),
    },
    {
      name: S5,
      description: "QA marca y GDPR/LOPD (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptComunicacionesQa(
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
      description: "Report engagement por canal (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptComunicacionesReport(
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

export class ComunicacionesPremiumAgent extends BaseOsAgent {
  readonly serviceId = "canales_comunicaciones_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
