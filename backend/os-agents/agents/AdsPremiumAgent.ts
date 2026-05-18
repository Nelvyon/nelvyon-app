import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { buildAdsBundleFiles, publishAdsBundleZip, runAdsCodegen } from "../artifacts/adsBundleBuilder";
import { eliteAdsIntakeStrings } from "./elitePayloadStrings";
import {
  promptAdsAudienceResearch,
  promptAdsBidding,
  promptAdsCampaignStrategy,
  promptAdsCreative,
  promptAdsDeliveryReport,
  promptAdsTracking,
} from "./adsPremiumPrompts";

const S1 = "audience_research";
const S2 = "campaign_strategy";
const S3 = "ad_creative";
const S4 = "bidding_strategy";
const S5 = "tracking_setup";
const S6 = "delivery_report";
const S7 = "creative_html";
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

function buildSteps(llm: ILlmClient, publishZip: typeof publishAdsBundleZip = publishAdsBundleZip): OsAgentStep[] {
  return [
    {
      name: S1,
      description: "Investigación de audiencias y segmentación (LLM)",
      run: async (payload) => llm.complete(promptAdsAudienceResearch(payload)),
    },
    {
      name: S2,
      description: "Estrategia de campañas por plataforma (LLM)",
      run: async (payload, ctx) => llm.complete(promptAdsCampaignStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Copy y creatividades para anuncios (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptAdsCreative(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Estrategia de pujas y presupuesto (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptAdsBidding(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload)),
    },
    {
      name: S5,
      description: "Plan de tracking y medición de conversiones (LLM)",
      run: async (payload, ctx) =>
        llm.complete(
          promptAdsTracking(
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
      description: "Report con ROI y plan de lanzamiento (LLM, Markdown)",
      run: async (payload, ctx) => {
        const { clientName } = eliteAdsIntakeStrings(payload);
        return llm.complete(
          promptAdsDeliveryReport(
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
      description: "Genera HTML visual por plataforma y formato (plantilla determinista)",
      run: async (payload, ctx) => runAdsCodegen(stepResult(ctx, S3), payload),
    },
    {
      name: S8,
      description: "Empaqueta creatividades en ZIP descargable",
      run: async (payload, ctx) => {
        const files = buildAdsBundleFiles(stepResult(ctx, S3), payload);
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

export class AdsPremiumAgent extends BaseOsAgent {
  readonly serviceId = "ads_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(
    llm: ILlmClient = LlmClient.getInstance(),
    publishZip: typeof publishAdsBundleZip = publishAdsBundleZip,
  ) {
    super();
    this.steps = buildSteps(llm, publishZip);
  }
}
