import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { eliteCommonIntakeStrings } from "./elitePayloadStrings";
import {
  promptBrandingApplications,
  promptBrandingAudit,
  promptBrandingDeliveryReport,
  promptBrandingStrategy,
  promptBrandingVisual,
  promptBrandingVoice,
} from "./brandingPremiumPrompts";

const S1 = "brand_audit";
const S2 = "brand_strategy";
const S3 = "visual_identity";
const S4 = "brand_voice";
const S5 = "brand_applications";
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
      description: "Auditoría de marca actual y oportunidades (LLM)",
      run: async (payload) => llm.complete(promptBrandingAudit(payload)),
    },
    {
      name: S2,
      description: "Estrategia de marca — misión, visión, valores (LLM)",
      run: async (payload, ctx) => llm.complete(promptBrandingStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Sistema de identidad visual (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptBrandingVisual(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Voz y tono de marca — guidelines (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptBrandingVoice(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload)),
    },
    {
      name: S5,
      description: "Aplicaciones de marca — web, social, print (LLM)",
      run: async (payload, ctx) =>
        llm.complete(
          promptBrandingApplications(
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
      description: "Brand book ejecutivo completo (LLM, Markdown)",
      run: async (payload, ctx) => {
        const { clientName } = eliteCommonIntakeStrings(payload);
        return llm.complete(
          promptBrandingDeliveryReport(
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

export class BrandingPremiumAgent extends BaseOsAgent {
  readonly serviceId = "branding_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(llm: ILlmClient = LlmClient.getInstance()) {
    super();
    this.steps = buildSteps(llm);
  }
}
