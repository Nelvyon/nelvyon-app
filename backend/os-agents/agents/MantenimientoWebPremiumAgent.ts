import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptMantenimientoWebAnalysis,
  promptMantenimientoWebExecution,
  promptMantenimientoWebOptimization,
  promptMantenimientoWebQa,
  promptMantenimientoWebReport,
  promptMantenimientoWebStrategy,
} from "./mantenimientoWebPremiumPrompts";

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
      description: "Auditoría técnica, CWV, seguridad (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptMantenimientoWebAnalysis(payload)),
    },
    {
      name: S2,
      description: "Plan mantenimiento mensual (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S2, promptMantenimientoWebStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Checklist 30 puntos (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, promptMantenimientoWebExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Performance LCP/CLS/INP (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptMantenimientoWebOptimization(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            payload,
          ),
        ),
    },
    {
      name: S5,
      description: "Uptime, alertas, contingencia (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptMantenimientoWebQa(
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
      description: "Report SLA y salud (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptMantenimientoWebReport(
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

export class MantenimientoWebPremiumAgent extends BaseOsAgent {
  readonly serviceId = "mantenimiento_web_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
