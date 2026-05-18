import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import { OsAgentError } from "../OsAgentError";
import { GenerativeClient } from "../generative";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptPhotoAnalysis,
  promptPhotoExecution,
  promptPhotoOptimization,
  promptPhotoQa,
  promptPhotoReport,
  promptPhotoStrategy,
} from "./fotografiaProductoPremiumPrompts";

const S1 = "analysis";
const S2 = "strategy";
const S3 = "execution";
const S4 = "optimization";
const S5 = "qa";
const S6 = "report";
const S7 = "generate_images";

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
      description: "Benchmarks fotográficos sector (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptPhotoAnalysis(payload)),
    },
    {
      name: S2,
      description: "Plan fotográfico y shot list (LLM)",
      run: async (payload, ctx) => completeLlmStep(llm, S2, promptPhotoStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Brief iluminación y retoque (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, promptPhotoExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Optimización web imágenes (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptPhotoOptimization(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload),
        ),
    },
    {
      name: S5,
      description: "QA color y fondos (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptPhotoQa(
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
      description: "Report CTR y tiempo en página (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptPhotoReport(
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
      description: "Generación real de assets fotográficos (DALL-E 3)",
      run: async (payload, ctx) => {
        try {
          const clientName = String(payload.clientName ?? "Brand");
          const audience = String(payload.targetAudience ?? "customers");
          const primaryColor = String(payload.primaryColor ?? "neutral");
          const _brief = stepResult(ctx, S3);
          const prompts = [
            `Professional product photography, ${clientName} product, hero angle, white background, studio lighting, 8K, commercial quality`,
            `Lifestyle product photography, ${clientName}, ${audience} using product, natural lighting, aspirational`,
            `Macro product photography, ${clientName}, detail texture, ${primaryColor} color scheme, professional studio`,
          ];
          const assets = await Promise.all(prompts.map((prompt) => GenerativeClient.generateImage(prompt)));
          return JSON.stringify({ assets: assets.map((a) => a.url) });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new OsAgentError(`${S7}: ${msg}`, "generative_step");
        }
      },
    },
  ];
}

export class FotografiaProductoPremiumAgent extends BaseOsAgent {
  readonly serviceId = "fotografia_producto_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
