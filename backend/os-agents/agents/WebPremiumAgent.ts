import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import {
  buildStaticSiteFiles,
  publishStaticSiteZip,
  runSiteCodegen,
} from "./webStaticBuilder";
import {
  promptWebPremiumBriefAnalysis,
  promptWebPremiumContentGeneration,
  promptWebPremiumDeliveryReport,
  promptWebPremiumDesignProposal,
  promptWebPremiumQaChecklist,
  promptWebPremiumSeoSetup,
  webPremiumIntakeStrings,
} from "./webPremiumPrompts";

const STEP_BRIEF_ANALYSIS = "brief_analysis";
const STEP_DESIGN_PROPOSAL = "design_proposal";
const STEP_CONTENT_GENERATION = "content_generation";
const STEP_SEO_SETUP = "seo_setup";
const STEP_QA_CHECKLIST = "qa_checklist";
const STEP_DELIVERY_REPORT = "delivery_report";
const STEP_SITE_CODEGEN = "site_codegen";
const STEP_BUNDLE_PUBLISH = "bundle_publish";

function stepResult(ctx: OsJobContext, name: string): string {
  return ctx.stepResults[name] ?? "";
}

function tenantIdFrom(payload: OsJobPayload, ctx: OsJobContext): string {
  const fromPayload = payload.tenantId;
  if (typeof fromPayload === "string" && fromPayload.trim()) return fromPayload.trim();
  return ctx.clientId;
}

function buildWebPremiumSteps(
  llm: ILlmClient,
  publishZip: typeof publishStaticSiteZip = publishStaticSiteZip,
): OsAgentStep[] {
  return [
    {
      name: STEP_BRIEF_ANALYSIS,
      description: "Analiza el brief del cliente (LLM)",
      run: async (payload) => {
        return llm.complete(promptWebPremiumBriefAnalysis(payload));
      },
    },
    {
      name: STEP_DESIGN_PROPOSAL,
      description: "Propone arquitectura visual (LLM)",
      run: async (payload, ctx) => {
        const s1 = stepResult(ctx, STEP_BRIEF_ANALYSIS);
        return llm.complete(promptWebPremiumDesignProposal(s1, payload));
      },
    },
    {
      name: STEP_CONTENT_GENERATION,
      description: "Genera contenido por página (LLM)",
      run: async (payload, ctx) => {
        const s1 = stepResult(ctx, STEP_BRIEF_ANALYSIS);
        const s2 = stepResult(ctx, STEP_DESIGN_PROPOSAL);
        return llm.complete(promptWebPremiumContentGeneration(s1, s2, payload));
      },
    },
    {
      name: STEP_SEO_SETUP,
      description: "Configuración SEO (LLM)",
      run: async (_payload, ctx) => {
        const s1 = stepResult(ctx, STEP_BRIEF_ANALYSIS);
        const s3 = stepResult(ctx, STEP_CONTENT_GENERATION);
        return llm.complete(promptWebPremiumSeoSetup(s3, s1));
      },
    },
    {
      name: STEP_QA_CHECKLIST,
      description: "Checklist QA (LLM)",
      run: async (_payload, ctx) => {
        const s1 = stepResult(ctx, STEP_BRIEF_ANALYSIS);
        const s2 = stepResult(ctx, STEP_DESIGN_PROPOSAL);
        const s3 = stepResult(ctx, STEP_CONTENT_GENERATION);
        const s4 = stepResult(ctx, STEP_SEO_SETUP);
        return llm.complete(promptWebPremiumQaChecklist(s1, s2, s3, s4));
      },
    },
    {
      name: STEP_DELIVERY_REPORT,
      description: "Reporte final de entrega (LLM, markdown)",
      run: async (payload, ctx) => {
        const s1 = stepResult(ctx, STEP_BRIEF_ANALYSIS);
        const s2 = stepResult(ctx, STEP_DESIGN_PROPOSAL);
        const s3 = stepResult(ctx, STEP_CONTENT_GENERATION);
        const s4 = stepResult(ctx, STEP_SEO_SETUP);
        const s5 = stepResult(ctx, STEP_QA_CHECKLIST);
        const s3Summary = s3.length > 1200 ? `${s3.slice(0, 1200)}…` : s3;
        const { clientName } = webPremiumIntakeStrings(payload);
        return llm.complete(promptWebPremiumDeliveryReport(clientName, s1, s2, s3Summary, s4, s5));
      },
    },
    {
      name: STEP_SITE_CODEGEN,
      description: "Genera HTML/CSS/JS estático desde el brief (plantilla determinista)",
      run: async (payload, ctx) => {
        const design = stepResult(ctx, STEP_DESIGN_PROPOSAL);
        const content = stepResult(ctx, STEP_CONTENT_GENERATION);
        return runSiteCodegen(design, content, payload);
      },
    },
    {
      name: STEP_BUNDLE_PUBLISH,
      description: "Empaqueta sitio en ZIP y registra activo descargable",
      run: async (payload, ctx) => {
        const design = stepResult(ctx, STEP_DESIGN_PROPOSAL);
        const content = stepResult(ctx, STEP_CONTENT_GENERATION);
        const { clientName } = webPremiumIntakeStrings(payload);
        const files = buildStaticSiteFiles(content, design, clientName);
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

/**
 * Real `web_premium` pipeline: LLM steps 1–6, static site codegen + ZIP publish (MIG 303).
 */
export class WebPremiumAgent extends BaseOsAgent {
  readonly serviceId = "web_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(
    llm: ILlmClient = LlmClient.getInstance(),
    publishZip: typeof publishStaticSiteZip = publishStaticSiteZip,
  ) {
    super();
    this.steps = buildWebPremiumSteps(llm, publishZip);
  }
}
