import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptInteligenciaMercadoAnalysis,
  promptInteligenciaMercadoExecution,
  promptInteligenciaMercadoOptimization,
  promptInteligenciaMercadoQa,
  promptInteligenciaMercadoReport,
  promptInteligenciaMercadoStrategy,
} from "./inteligenciaMercadoPremiumPrompts";

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
      description: "Encuadre: que decision hay que tomar (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptInteligenciaMercadoAnalysis(payload)),
    },
    {
      name: S2,
      description: "Mapa competitivo verificable (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S2, promptInteligenciaMercadoStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Hallazgos con fuente y origen (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, promptInteligenciaMercadoExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Implicaciones ancladas a hallazgos (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptInteligenciaMercadoOptimization(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            payload,
          ),
        ),
    },
    {
      name: S5,
      description: "QA adversarial del informe (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptInteligenciaMercadoQa(
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
      description: "Informe de mercado (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptInteligenciaMercadoReport(
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

export class InteligenciaMercadoPremiumAgent extends BaseOsAgent {
  readonly serviceId = "inteligencia_mercado_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
