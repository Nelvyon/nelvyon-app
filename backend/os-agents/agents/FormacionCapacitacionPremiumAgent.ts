import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptFormacionCapacitacionAnalysis,
  promptFormacionCapacitacionExecution,
  promptFormacionCapacitacionOptimization,
  promptFormacionCapacitacionQa,
  promptFormacionCapacitacionReport,
  promptFormacionCapacitacionStrategy,
} from "./formacionCapacitacionPremiumPrompts";

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
      description: "Diagnóstico formativo y benchmarks (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptFormacionCapacitacionAnalysis(payload)),
    },
    {
      name: S2,
      description: "Plan formativo 90 días y LMS (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S2, promptFormacionCapacitacionStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "5 cursos con temario y evaluaciones (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S3,
          promptFormacionCapacitacionExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload),
        ),
    },
    {
      name: S4,
      description: "Gamificación y learning paths (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptFormacionCapacitacionOptimization(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            payload,
          ),
        ),
    },
    {
      name: S5,
      description: "QA pedagógico y accesibilidad (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptFormacionCapacitacionQa(
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
      description: "Report ROI formativo (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptFormacionCapacitacionReport(
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

export class FormacionCapacitacionPremiumAgent extends BaseOsAgent {
  readonly serviceId = "formacion_capacitacion_digital_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
