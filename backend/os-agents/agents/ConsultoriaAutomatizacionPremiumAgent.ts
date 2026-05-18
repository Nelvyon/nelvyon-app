import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptConsultoriaAutomatizacionAnalysis,
  promptConsultoriaAutomatizacionExecution,
  promptConsultoriaAutomatizacionOptimization,
  promptConsultoriaAutomatizacionQa,
  promptConsultoriaAutomatizacionReport,
  promptConsultoriaAutomatizacionStrategy,
} from "./consultoriaAutomatizacionPremiumPrompts";

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
      description: "Auditoría de procesos (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptConsultoriaAutomatizacionAnalysis(payload)),
    },
    {
      name: S2,
      description: "Roadmap automatización 90 días (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S2, promptConsultoriaAutomatizacionStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "5 flujos n8n/Zapier/Make (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S3,
          promptConsultoriaAutomatizacionExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload),
        ),
    },
    {
      name: S4,
      description: "KPIs y ROI (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptConsultoriaAutomatizacionOptimization(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            payload,
          ),
        ),
    },
    {
      name: S5,
      description: "QA flujos y fallbacks (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptConsultoriaAutomatizacionQa(
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
      description: "Report ahorro horas y ROI (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptConsultoriaAutomatizacionReport(
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

export class ConsultoriaAutomatizacionPremiumAgent extends BaseOsAgent {
  readonly serviceId = "consultoria_automatizacion_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
