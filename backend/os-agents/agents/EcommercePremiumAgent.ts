import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
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
      description: "Analiza mercado, competencia y oportunidad del ecommerce (LLM)",
      run: async (payload) => llm.complete(promptEcommerceMarketAnalysis(payload)),
    },
    {
      name: S2,
      description: "Estructura de tienda, categorías, navegación, UX (LLM)",
      run: async (payload, ctx) => llm.complete(promptEcommerceStoreArchitecture(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Estrategia de producto, descripciones, fotografía, pricing (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptEcommerceProductStrategy(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "CRO — funnel, checkout, upsells, emails (LLM)",
      run: async (payload, ctx) =>
        llm.complete(
          promptEcommerceConversion(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload),
        ),
    },
    {
      name: S5,
      description: "SEO ecommerce — PDP, schema, Core Web Vitals (LLM)",
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
      description: "Report ejecutivo completo (LLM, Markdown)",
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
  ];
}

export class EcommercePremiumAgent extends BaseOsAgent {
  readonly serviceId = "ecommerce_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
