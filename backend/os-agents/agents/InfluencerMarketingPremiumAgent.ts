import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptInfluencerMarketingAnalysis,
  promptInfluencerMarketingExecution,
  promptInfluencerMarketingOptimization,
  promptInfluencerMarketingQa,
  promptInfluencerMarketingReport,
  promptInfluencerMarketingStrategy,
} from "./influencerMarketingPremiumPrompts";

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
      description: "Mapa de influencers y engagement (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptInfluencerMarketingAnalysis(payload)),
    },
    {
      name: S2,
      description: "Plan macro/micro/nano y presupuesto (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S2, promptInfluencerMarketingStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Brief 5 campañas (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S3,
          promptInfluencerMarketingExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload),
        ),
    },
    {
      name: S4,
      description: "UTM, descuentos, atribución (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptInfluencerMarketingOptimization(
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            stepResult(ctx, S3),
            payload,
          ),
        ),
    },
    {
      name: S5,
      description: "Compliance FTC y contratos (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptInfluencerMarketingQa(
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
      description: "Report alcance y CPM (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptInfluencerMarketingReport(
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

export class InfluencerMarketingPremiumAgent extends BaseOsAgent {
  readonly serviceId = "influencer_marketing_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
