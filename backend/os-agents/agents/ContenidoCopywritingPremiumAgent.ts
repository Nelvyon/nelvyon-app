import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import {
  buildContentBundleFiles,
  publishContentBundleZip,
  runContentCodegen,
} from "../artifacts/contentBundleBuilder";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptCopyAnalysis,
  promptCopyExecution,
  promptCopyOptimization,
  promptCopyQa,
  promptCopyReport,
  promptCopyStrategy,
} from "./contenidoCopywritingPremiumPrompts";

const S1 = "analysis";
const S2 = "strategy";
const S3 = "execution";
const S4 = "optimization";
const S5 = "qa";
const S6 = "report";
const S7 = "content_codegen";
const S8 = "bundle_publish";

function stepResult(ctx: OsJobContext, name: string): string {
  return ctx.stepResults[name] ?? "";
}

function summarize(text: string, max = 1200): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function tenantIdFrom(payload: OsJobPayload, ctx: OsJobContext): string {
  const fromPayload = payload.tenantId;
  if (typeof fromPayload === "string" && fromPayload.trim()) return fromPayload.trim();
  return ctx.clientId;
}

function buildSteps(
  llm: ILlmClient,
  publishZip: typeof publishContentBundleZip = publishContentBundleZip,
): OsAgentStep[] {
  return [
    {
      name: S1,
      description: "Auditoría de voz y competidores (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptCopyAnalysis(payload)),
    },
    {
      name: S2,
      description: "Calendario 90d y topic clusters (LLM)",
      run: async (payload, ctx) => completeLlmStep(llm, S2, promptCopyStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "15 piezas de contenido (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, promptCopyExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "SEO on-page y meta copy (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptCopyOptimization(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload),
        ),
    },
    {
      name: S5,
      description: "QA tono y legibilidad (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptCopyQa(
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
      description: "Report tráfico y engagement (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptCopyReport(
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
      description: "Genera índice HTML y piezas de contenido (plantilla determinista)",
      run: async (payload, ctx) => runContentCodegen(stepResult(ctx, S3), payload),
    },
    {
      name: S8,
      description: "Empaqueta bundle de contenido en ZIP descargable",
      run: async (payload, ctx) => {
        const files = buildContentBundleFiles(stepResult(ctx, S3), payload);
        const published = await publishZip({
          clientId: ctx.clientId,
          tenantId: tenantIdFrom(payload, ctx),
          jobId: ctx.jobId,
          serviceId: ctx.serviceId,
          files,
        });
        return JSON.stringify(published);
      },
    },
  ];
}

export class ContenidoCopywritingPremiumAgent extends BaseOsAgent {
  readonly serviceId = "contenido_copywriting_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(
    llm: ILlmClient = LlmClient.getInstance(),
    publishZip: typeof publishContentBundleZip = publishContentBundleZip,
  ) {
    super();
    this.steps = buildSteps(llm, publishZip);
  }
}
