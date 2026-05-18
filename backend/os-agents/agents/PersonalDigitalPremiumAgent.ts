import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptPersonalDigitalAnalysis,
  promptPersonalDigitalExecution,
  promptPersonalDigitalOptimization,
  promptPersonalDigitalQa,
  promptPersonalDigitalReport,
  promptPersonalDigitalStrategy,
} from "./personalDigitalPremiumPrompts";

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
      description: "Auditoría marca personal (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptPersonalDigitalAnalysis(payload)),
    },
    {
      name: S2,
      description: "Plan thought leadership (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S2, promptPersonalDigitalStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "30 posts LinkedIn y bio (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S3,
          promptPersonalDigitalExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload),
        ),
    },
    {
      name: S4,
      description: "SEO perfil y engagement loops (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptPersonalDigitalOptimization(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            payload,
          ),
        ),
    },
    {
      name: S5,
      description: "QA voz y diferenciación (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptPersonalDigitalQa(
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
      description: "Report crecimiento audiencia (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptPersonalDigitalReport(
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

export class PersonalDigitalPremiumAgent extends BaseOsAgent {
  readonly serviceId = "personal_digital_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
