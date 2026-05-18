import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import {
  buildSeoReportFiles,
  publishSeoReportZip,
  runSeoReportCodegen,
} from "../artifacts/seoReportBuilder";
import { eliteSeoIntakeStrings } from "./elitePayloadStrings";
import {
  promptSeoAudit,
  promptSeoContentStrategy,
  promptSeoDeliveryReport,
  promptSeoKeywordResearch,
  promptSeoLinkBuilding,
  promptSeoTechnical,
} from "./seoPremiumPrompts";

const S1 = "seo_audit";
const S2 = "keyword_research";
const S3 = "content_strategy";
const S4 = "technical_seo";
const S5 = "link_building";
const S6 = "delivery_report";
const S7 = "report_codegen";
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

function buildSteps(llm: ILlmClient, publishZip: typeof publishSeoReportZip = publishSeoReportZip): OsAgentStep[] {
  return [
    {
      name: S1,
      description: "Auditoría SEO completa del negocio y sector (LLM)",
      run: async (payload) => llm.complete(promptSeoAudit(payload)),
    },
    {
      name: S2,
      description: "Investigación de palabras clave con intención (LLM)",
      run: async (payload, ctx) => llm.complete(promptSeoKeywordResearch(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Estrategia de contenido para posicionar (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptSeoContentStrategy(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Recomendaciones técnicas prioritarias (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptSeoTechnical(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload)),
    },
    {
      name: S5,
      description: "Estrategia de link building y autoridad (LLM)",
      run: async (payload, ctx) =>
        llm.complete(
          promptSeoLinkBuilding(
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
      description: "Report ejecutivo con plan 90 días (LLM, Markdown)",
      run: async (payload, ctx) => {
        const { clientName } = eliteSeoIntakeStrings(payload);
        return llm.complete(
          promptSeoDeliveryReport(
            clientName,
            stepResult(ctx, S1),
            stepResult(ctx, S2),
            summarize(stepResult(ctx, S3)),
            summarize(stepResult(ctx, S4)),
            stepResult(ctx, S5),
          ),
        );
      },
    },
    {
      name: S7,
      description: "Genera informe HTML + checklist (plantilla determinista)",
      run: async (payload, ctx) =>
        runSeoReportCodegen(
          stepResult(ctx, S1),
          stepResult(ctx, S2),
          stepResult(ctx, S3),
          stepResult(ctx, S4),
          stepResult(ctx, S5),
          payload,
        ),
    },
    {
      name: S8,
      description: "Empaqueta informe SEO en ZIP descargable",
      run: async (payload, ctx) => {
        const files = buildSeoReportFiles(
          stepResult(ctx, S1),
          stepResult(ctx, S2),
          stepResult(ctx, S3),
          stepResult(ctx, S4),
          stepResult(ctx, S5),
          payload,
        );
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

export class SeoPremiumAgent extends BaseOsAgent {
  readonly serviceId = "seo_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(
    llm: ILlmClient = LlmClient.getInstance(),
    publishZip: typeof publishSeoReportZip = publishSeoReportZip,
  ) {
    super();
    this.steps = buildSteps(llm, publishZip);
  }
}
