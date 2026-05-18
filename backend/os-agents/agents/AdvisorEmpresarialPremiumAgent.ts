import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptAdvisorEmpresarialAnalysis,
  promptAdvisorEmpresarialExecution,
  promptAdvisorEmpresarialOptimization,
  promptAdvisorEmpresarialQa,
  promptAdvisorEmpresarialReport,
  promptAdvisorEmpresarialStrategy,
} from "./advisorEmpresarialPremiumPrompts";

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
      description: "Diagnóstico 360° DAFO (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptAdvisorEmpresarialAnalysis(payload)),
    },
    {
      name: S2,
      description: "Plan estratégico 12 meses (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S2, promptAdvisorEmpresarialStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "90 iniciativas y OKRs (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S3,
          promptAdvisorEmpresarialExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload),
        ),
    },
    {
      name: S4,
      description: "Quick wins y dashboard (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptAdvisorEmpresarialOptimization(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            payload,
          ),
        ),
    },
    {
      name: S5,
      description: "QA riesgos y financiero (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptAdvisorEmpresarialQa(
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
      description: "Report crecimiento 12m (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptAdvisorEmpresarialReport(
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

export class AdvisorEmpresarialPremiumAgent extends BaseOsAgent {
  readonly serviceId = "advisor_empresarial_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
