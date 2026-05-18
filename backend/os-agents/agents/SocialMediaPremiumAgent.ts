import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import {
  buildSocialMediaFiles,
  publishSocialBundleZip,
  runSocialCalendarCodegen,
} from "../artifacts/socialMediaBuilder";
import { eliteSocialIntakeStrings } from "./elitePayloadStrings";
import {
  promptSocialAnalytics,
  promptSocialAudit,
  promptSocialCalendar,
  promptSocialCommunity,
  promptSocialContentStrategy,
  promptSocialDeliveryReport,
} from "./socialMediaPremiumPrompts";

const S1 = "social_audit";
const S2 = "content_strategy";
const S3 = "content_calendar";
const S4 = "community_strategy";
const S5 = "analytics_setup";
const S6 = "delivery_report";
const S7 = "calendar_codegen";
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
  publishZip: typeof publishSocialBundleZip = publishSocialBundleZip,
): OsAgentStep[] {
  return [
    {
      name: S1,
      description: "Auditoría de presencia social actual (LLM)",
      run: async (payload) => llm.complete(promptSocialAudit(payload)),
    },
    {
      name: S2,
      description: "Estrategia de contenido por plataforma (LLM)",
      run: async (payload, ctx) => llm.complete(promptSocialContentStrategy(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Calendario editorial 30 días (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptSocialCalendar(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "Estrategia de comunidad y engagement (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptSocialCommunity(stepResult(ctx, S1), stepResult(ctx, S2), stepResult(ctx, S3), payload)),
    },
    {
      name: S5,
      description: "KPIs y plan de reporting mensual (LLM)",
      run: async (payload, ctx) =>
        llm.complete(
          promptSocialAnalytics(
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
      description: "Report con estrategia y 30 días planificados (LLM, Markdown)",
      run: async (payload, ctx) => {
        const { clientName } = eliteSocialIntakeStrings(payload);
        return llm.complete(
          promptSocialDeliveryReport(
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
      description: "Genera calendario HTML + posts por plataforma (plantilla determinista)",
      run: async (payload, ctx) =>
        runSocialCalendarCodegen(stepResult(ctx, S3), stepResult(ctx, S2), payload),
    },
    {
      name: S8,
      description: "Empaqueta calendario social en ZIP descargable",
      run: async (payload, ctx) => {
        const files = buildSocialMediaFiles(stepResult(ctx, S3), stepResult(ctx, S2), payload);
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

export class SocialMediaPremiumAgent extends BaseOsAgent {
  readonly serviceId = "social_media_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(
    llm: ILlmClient = LlmClient.getInstance(),
    publishZip: typeof publishSocialBundleZip = publishSocialBundleZip,
  ) {
    super();
    this.steps = buildSteps(llm, publishZip);
  }
}
