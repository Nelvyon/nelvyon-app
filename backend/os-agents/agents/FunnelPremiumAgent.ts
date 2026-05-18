import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { buildFunnelFiles, publishFunnelZip, runFunnelCodegen } from "../artifacts/funnelBuilder";
import { eliteCommonIntakeStrings } from "./elitePayloadStrings";
import {
  promptEcommerceConversion,
  promptEcommerceDeliveryReport,
  promptEcommerceMarketAnalysis,
  promptEcommerceProductStrategy,
  promptEcommerceSeo,
  promptEcommerceStoreArchitecture,
} from "./ecommercePremiumPrompts";

const S1 = "market_analysis";
const S2 = "store_architecture";
const S3 = "product_strategy";
const S4 = "conversion_optimization";
const S5 = "seo_ecommerce";
const S6 = "delivery_report";
const S7 = "funnel_codegen";
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

function designProxyFromStoreArchitecture(storeJson: string, payload: OsJobPayload): string {
  const { primaryColor, secondaryColor } = eliteCommonIntakeStrings(payload);
  return JSON.stringify({
    colorPalette: { primary: primaryColor, secondary: secondaryColor, accent: "#7c3aed", background: "#ffffff", text: "#1e293b" },
    typography: { heading: "system-ui", body: "system-ui" },
    storeArchitecture: storeJson.slice(0, 500),
  });
}

function buildFunnelPremiumSteps(
  llm: ILlmClient,
  publishZip: typeof publishFunnelZip = publishFunnelZip,
): OsAgentStep[] {
  return [
    {
      name: S1,
      description: "Análisis de mercado y oportunidad del funnel (LLM)",
      run: async (payload) => llm.complete(promptEcommerceMarketAnalysis(payload)),
    },
    {
      name: S2,
      description: "Arquitectura de páginas del funnel (LLM)",
      run: async (payload, ctx) => llm.complete(promptEcommerceStoreArchitecture(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Estrategia de oferta y copy por etapa (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptEcommerceProductStrategy(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "CRO multi-paso: opt-in, oferta, cierre (LLM)",
      run: async (payload, ctx) =>
        llm.complete(
          promptEcommerceConversion(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload),
        ),
    },
    {
      name: S5,
      description: "SEO y tracking del funnel (LLM)",
      run: async (payload, ctx) =>
        llm.complete(
          promptEcommerceSeo(
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
      description: "Reporte ejecutivo del funnel (LLM, Markdown)",
      run: async (payload, ctx) => {
        const { clientName } = eliteCommonIntakeStrings(payload);
        return llm.complete(
          promptEcommerceDeliveryReport(
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
      description: "Genera paso1–3 HTML + JS de navegación (plantilla determinista)",
      run: async (payload, ctx) => {
        const design = designProxyFromStoreArchitecture(stepResult(ctx, S2), payload);
        return runFunnelCodegen(stepResult(ctx, S4), design, payload);
      },
    },
    {
      name: S8,
      description: "Empaqueta funnel en ZIP descargable",
      run: async (payload, ctx) => {
        const design = designProxyFromStoreArchitecture(stepResult(ctx, S2), payload);
        const { clientName } = eliteCommonIntakeStrings(payload);
        const files = buildFunnelFiles(stepResult(ctx, S4), design, clientName);
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

/** Funnel multi-paso premium: pipeline ecommerce + HTML real (MIG 304). */
export class FunnelPremiumAgent extends BaseOsAgent {
  readonly serviceId = "funnel_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(
    llm: ILlmClient = LlmClient.getInstance(),
    publishZip: typeof publishFunnelZip = publishFunnelZip,
  ) {
    super();
    this.steps = buildFunnelPremiumSteps(llm, publishZip);
  }
}
