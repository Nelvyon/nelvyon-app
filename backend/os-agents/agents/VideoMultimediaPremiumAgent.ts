import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import { OsAgentError } from "../OsAgentError";
import { GenerativeClient } from "../generative";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptVideoAnalysis,
  promptVideoExecution,
  promptVideoOptimization,
  promptVideoQa,
  promptVideoReport,
  promptVideoStrategy,
} from "./videoMultimediaPremiumPrompts";

const S1 = "analysis";
const S2 = "strategy";
const S3 = "execution";
const S4 = "optimization";
const S5 = "qa";
const S6 = "report";
const S7 = "generate_video";

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
      description: "Benchmarks de video en sector (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptVideoAnalysis(payload)),
    },
    {
      name: S2,
      description: "Plan de producción y storyboards (LLM)",
      run: async (payload, ctx) => completeLlmStep(llm, S2, promptVideoStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "5 guiones listos para producir (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, promptVideoExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Hooks, retención y CTAs (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptVideoOptimization(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload),
        ),
    },
    {
      name: S5,
      description: "QA producción y branding (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptVideoQa(
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
      description: "Report vistas y conversión (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptVideoReport(
            payload,
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            summarize(stepResult(ctx, S3)),
            summarize(stepResult(ctx, S4)),
            stepResult(ctx, S5),
          ),
        ),
    },
    {
      name: S7,
      description: "Generación real de video marketing (Runway)",
      run: async (payload) => {
        try {
          const clientName = String(payload.clientName ?? "Brand");
          const industry = String(payload.industry ?? "business");
          const primaryColor = String(payload.primaryColor ?? "brand");
          const prompt = `${clientName} brand video, professional marketing, ${industry} sector, modern aesthetic, ${primaryColor} brand colors, cinematic quality`;
          const asset = await GenerativeClient.generateVideo(prompt);
          return asset.url;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new OsAgentError(`${S7}: ${msg}`, "generative_step");
        }
      },
    },
  ];
}

export class VideoMultimediaPremiumAgent extends BaseOsAgent {
  readonly serviceId = "video_multimedia_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
