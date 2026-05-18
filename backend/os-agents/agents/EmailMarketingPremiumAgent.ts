import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import {
  buildEmailBundleFiles,
  publishEmailBundleZip,
  runEmailCodegen,
} from "../artifacts/emailBundleBuilder";
import { completeLlmStep } from "./lote2AgentStepRunner";
import {
  promptEmailAnalysis,
  promptEmailExecution,
  promptEmailOptimization,
  promptEmailQa,
  promptEmailReport,
  promptEmailStrategy,
} from "./emailMarketingPremiumPrompts";

const S1 = "analysis";
const S2 = "strategy";
const S3 = "execution";
const S4 = "optimization";
const S5 = "qa";
const S6 = "report";
const S7 = "html_codegen";
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
  publishZip: typeof publishEmailBundleZip = publishEmailBundleZip,
): OsAgentStep[] {
  return [
    {
      name: S1,
      description: "Auditoría de lista y segmentación (LLM)",
      run: async (payload) => completeLlmStep(llm, S1, promptEmailAnalysis(payload)),
    },
    {
      name: S2,
      description: "Estrategia de automatizaciones y secuencias (LLM)",
      run: async (payload, ctx) => completeLlmStep(llm, S2, promptEmailStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "10 emails asunto, preheader, body, CTA (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(llm, S3, promptEmailExecution(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Optimización A/B y personalización (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S4,
          promptEmailOptimization(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload),
        ),
    },
    {
      name: S5,
      description: "QA deliverability y rendering (LLM)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S5,
          promptEmailQa(
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
      description: "Report ejecutivo con KPIs (LLM, Markdown)",
      run: async (payload, ctx) =>
        completeLlmStep(
          llm,
          S6,
          promptEmailReport(
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
      description: "Genera HTML responsive por email (plantilla determinista)",
      run: async (payload, ctx) => runEmailCodegen(stepResult(ctx, S3), payload),
    },
    {
      name: S8,
      description: "Empaqueta campaña de emails en ZIP descargable",
      run: async (payload, ctx) => {
        const files = buildEmailBundleFiles(stepResult(ctx, S3), payload);
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

export class EmailMarketingPremiumAgent extends BaseOsAgent {
  readonly serviceId = "email_marketing_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(
    llm: ILlmClient = LlmClient.getInstance(),
    publishZip: typeof publishEmailBundleZip = publishEmailBundleZip,
  ) {
    super();
    this.steps = buildSteps(llm, publishZip);
  }
}
