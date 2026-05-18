import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import { OsAgentError } from "../OsAgentError";
import { GenerativeClient } from "../generative";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptVozAnalysis,
  promptVozExecution,
  promptVozOptimization,
  promptVozQa,
  promptVozReport,
  promptVozStrategy,
} from "./vozPremiumPrompts";

const S1 = "analysis";
const S2 = "strategy";
const S3 = "execution";
const S4 = "optimization";
const S5 = "qa";
const S6 = "report";
const S7 = "generate_voice";

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
      description: "Auditoría audio y voice search (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptVozAnalysis(payload)),
    },
    {
      name: S2,
      description: "Roadmap podcast y skills (LLM)",
      run: async (payload, ctx) => completeLlmStep(llm, S2, promptVozStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Guiones podcast y audio ads (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, promptVozExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "SEO voz y distribución (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptVozOptimization(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload),
        ),
    },
    {
      name: S5,
      description: "QA técnico audio LUFS (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptVozQa(
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
      description: "Report alcance audio (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptVozReport(
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
      description: "Generación real de audio voz (ElevenLabs)",
      run: async (_payload, ctx) => {
        try {
          const script = stepResult(ctx, S3).slice(0, 500);
          const text = script.trim().length > 0 ? script : "NELVYON audio demo";
          const asset = await GenerativeClient.generateVoice(text);
          return asset.url;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new OsAgentError(`${S7}: ${msg}`, "generative_step");
        }
      },
    },
  ];
}

export class VozPremiumAgent extends BaseOsAgent {
  readonly serviceId = "voz_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
