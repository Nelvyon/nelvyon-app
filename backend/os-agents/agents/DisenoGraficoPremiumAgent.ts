import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptDisenoGraficoAnalysis,
  promptDisenoGraficoExecution,
  promptDisenoGraficoOptimization,
  promptDisenoGraficoQa,
  promptDisenoGraficoReport,
  promptDisenoGraficoStrategy,
} from "./disenoGraficoPremiumPrompts";

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
      description: "Auditoría visual de marca y benchmarks (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptDisenoGraficoAnalysis(payload)),
    },
    {
      name: S2,
      description: "Sistema visual: paleta, tipografía, grid (LLM)",
      run: async (payload, ctx) => completeLlmStep(llm, S2, promptDisenoGraficoStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Brief creativo 10 piezas (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, promptDisenoGraficoExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Optimización multicanal y responsive (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptDisenoGraficoOptimization(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload),
        ),
    },
    {
      name: S5,
      description: "QA WCAG y consistencia visual (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptDisenoGraficoQa(
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
      description: "Report ejecutivo diseño (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptDisenoGraficoReport(
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

export class DisenoGraficoPremiumAgent extends BaseOsAgent {
  readonly serviceId = "diseno_grafico_creatividades_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
