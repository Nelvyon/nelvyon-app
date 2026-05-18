import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import {
  buildLandingPageFiles,
  publishLandingZip,
  runLandingCodegen,
} from "../artifacts/landingPageBuilder";
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
const STEP_LANDING_CODEGEN = "landing_codegen";
const STEP_BUNDLE_PUBLISH = "bundle_publish";

function stepResult(ctx: OsJobContext, name: string): string {
  return ctx.stepResults[name] ?? "";
}

function tenantIdFrom(payload: OsJobPayload, ctx: OsJobContext): string {
  const fromPayload = payload.tenantId;
  if (typeof fromPayload === "string" && fromPayload.trim()) return fromPayload.trim();
  return ctx.clientId;
}

function buildLandingPremiumSteps(
  llm: ILlmClient,
  publishZip: typeof publishLandingZip = publishLandingZip,
): OsAgentStep[] {
  return [
    {
      name: STEP_BRIEF_ANALYSIS,
      description: "Analiza el brief de la landing (LLM)",
      run: async (payload) => llm.complete(promptWebPremiumBriefAnalysis(payload)),
    },
    {
      name: STEP_DESIGN_PROPOSAL,
      description: "Propone arquitectura visual de conversión (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptWebPremiumDesignProposal(stepResult(ctx, STEP_BRIEF_ANALYSIS), payload)),
    },
    {
      name: STEP_CONTENT_GENERATION,
      description: "Genera copy hero, prueba social y formulario (LLM)",
      run: async (payload, ctx) =>
        llm.complete(
          promptWebPremiumContentGeneration(
            stepResult(ctx, STEP_BRIEF_ANALYSIS),
            stepResult(ctx, STEP_DESIGN_PROPOSAL),
            payload,
          ),
        ),
    },
    {
      name: STEP_SEO_SETUP,
      description: "SEO on-page de la landing (LLM)",
      run: async (_payload, ctx) =>
        llm.complete(
          promptWebPremiumSeoSetup(stepResult(ctx, STEP_CONTENT_GENERATION), stepResult(ctx, STEP_BRIEF_ANALYSIS)),
        ),
    },
    {
      name: STEP_QA_CHECKLIST,
      description: "Checklist QA CRO (LLM)",
      run: async (_payload, ctx) =>
        llm.complete(
          promptWebPremiumQaChecklist(
            stepResult(ctx, STEP_BRIEF_ANALYSIS),
            stepResult(ctx, STEP_DESIGN_PROPOSAL),
            stepResult(ctx, STEP_CONTENT_GENERATION),
            stepResult(ctx, STEP_SEO_SETUP),
          ),
        ),
    },
    {
      name: STEP_DELIVERY_REPORT,
      description: "Reporte de entrega landing (LLM, markdown)",
      run: async (payload, ctx) => {
        const s3 = stepResult(ctx, STEP_CONTENT_GENERATION);
        const s3Summary = s3.length > 1200 ? `${s3.slice(0, 1200)}…` : s3;
        const { clientName } = webPremiumIntakeStrings(payload);
        return llm.complete(
          promptWebPremiumDeliveryReport(
            clientName,
            stepResult(ctx, STEP_BRIEF_ANALYSIS),
            stepResult(ctx, STEP_DESIGN_PROPOSAL),
            s3Summary,
            stepResult(ctx, STEP_SEO_SETUP),
            stepResult(ctx, STEP_QA_CHECKLIST),
          ),
        );
      },
    },
    {
      name: STEP_LANDING_CODEGEN,
      description: "Genera index.html + CSS (plantilla determinista)",
      run: async (payload, ctx) =>
        runLandingCodegen(stepResult(ctx, STEP_DESIGN_PROPOSAL), stepResult(ctx, STEP_CONTENT_GENERATION), payload),
    },
    {
      name: STEP_BUNDLE_PUBLISH,
      description: "Empaqueta landing en ZIP descargable",
      run: async (payload, ctx) => {
        const design = stepResult(ctx, STEP_DESIGN_PROPOSAL);
        const content = stepResult(ctx, STEP_CONTENT_GENERATION);
        const { clientName } = webPremiumIntakeStrings(payload);
        const files = buildLandingPageFiles(content, design, clientName);
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

/** Landing premium: mismos pasos estratégicos que web + artefacto HTML real (MIG 304). */
export class LandingPremiumAgent extends BaseOsAgent {
  readonly serviceId = "landing_premium" as const;
  readonly steps: OsAgentStep[];

  constructor(
    llm: ILlmClient = LlmClient.getInstance(),
    publishZip: typeof publishLandingZip = publishLandingZip,
  ) {
    super();
    this.steps = buildLandingPremiumSteps(llm, publishZip);
  }
}
