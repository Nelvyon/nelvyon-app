import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import { OsAgentError } from "../OsAgentError";
import { GenerativeClient } from "../generative";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  prompt3dAnalysis,
  prompt3dExecution,
  prompt3dOptimization,
  prompt3dQa,
  prompt3dReport,
  prompt3dStrategy,
} from "./tresDInmersivoPremiumPrompts";

const S1 = "analysis";
const S2 = "strategy";
const S3 = "execution";
const S4 = "optimization";
const S5 = "qa";
const S6 = "report";
const S7 = "generate_3d";

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
      description: "Viabilidad 3D / AR / VR sector (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, prompt3dAnalysis(payload)),
    },
    {
      name: S2,
      description: "Roadmap activos y formatos (LLM)",
      run: async (payload, ctx) => completeLlmStep(llm, S2, prompt3dStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Especificaciones 5 escenas 3D (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, prompt3dExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Performance web 3D (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          prompt3dOptimization(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload),
        ),
    },
    {
      name: S5,
      description: "QA cross-browser y carga (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          prompt3dQa(
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
      description: "Report impacto y roadmap (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          prompt3dReport(
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
      description: "Generación real de modelo 3D (Meshy)",
      run: async (payload) => {
        try {
          const clientName = String(payload.clientName ?? "Brand");
          const industry = String(payload.industry ?? "business");
          const primaryColor = String(payload.primaryColor ?? "brand");
          const prompt = `${clientName} product 3D model, ${industry} style, high detail, PBR materials, ${primaryColor} primary color, professional quality`;
          const asset = await GenerativeClient.generate3D(prompt);
          return asset.url;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new OsAgentError(`${S7}: ${msg}`, "generative_step");
        }
      },
    },
  ];
}

/** Agente real para `3d_contenido_inmersivo_premium` (registro OS). */
export class TresDInmersivoPremiumAgent extends BaseOsAgent {
  readonly serviceId = "3d_contenido_inmersivo_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
