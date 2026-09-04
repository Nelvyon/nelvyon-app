import { BaseOsAgent } from "../BaseOsAgent";
import { LlmClient, type ILlmClient } from "../LlmClient";
import type { OsAgentStep, OsJobContext, OsJobPayload } from "../types";
import { buildFunnelFiles, publishFunnelZip, runFunnelCodegen } from "../artifacts/funnelBuilder";
import { eliteCommonIntakeStrings } from "./elitePayloadStrings";
import {
  promptFunnelArquitectura,
  promptFunnelDecision,
  promptFunnelEvidencia,
  promptFunnelExperimento,
  promptFunnelMedicion,
  promptFunnelOferta,
} from "./funnelPremiumPrompts";

const S1 = "evidencia_del_embudo";
const S2 = "arquitectura_del_embudo";
const S3 = "oferta_y_copy_con_hipotesis";
const S4 = "experimento_con_guardarrailes";
const S5 = "plan_de_medicion";
const S6 = "politica_de_decision";
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

/** El diseno visual sale de la arquitectura del embudo (S2). */
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
      description: "Dónde se pierde la gente, con la evidencia que haya (LLM)",
      run: async (payload) => llm.complete(promptFunnelEvidencia(payload)),
    },
    {
      name: S2,
      description: "Las páginas del embudo y el trabajo de cada una (LLM)",
      run: async (payload, ctx) => llm.complete(promptFunnelArquitectura(stepResult(ctx, S1), payload)),
    },
    {
      name: S3,
      description: "Oferta, copy por paso y las hipótesis que los sostienen (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptFunnelOferta(stepResult(ctx, S1), stepResult(ctx, S2), payload)),
    },
    {
      name: S4,
      description: "El experimento, con sus guardarraíles y su criterio fijado antes (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptFunnelExperimento(stepResult(ctx, S1), stepResult(ctx, S3), payload)),
    },
    {
      name: S5,
      description: "Cómo se mide y qué instrumentación falta antes de empezar (LLM)",
      run: async (payload, ctx) => llm.complete(promptFunnelMedicion(stepResult(ctx, S4), payload)),
    },
    {
      name: S6,
      description: "La política de decisión, escrita antes de tener resultados (LLM)",
      run: async (payload, ctx) =>
        llm.complete(promptFunnelDecision(stepResult(ctx, S4), stepResult(ctx, S5), payload)),
    },
    {
      name: S7,
      description: "Genera paso1–3 HTML + JS de navegación (plantilla determinista)",
      run: async (payload, ctx) => {
        const design = designProxyFromStoreArchitecture(stepResult(ctx, S2), payload);
        // El HTML sale del COPY (S3), no del experimento (S4). Generar las
        // paginas a partir del diseno del test produciria un embudo que solo
        // existe mientras dure el experimento.
        return runFunnelCodegen(stepResult(ctx, S3), design, payload);
      },
    },
    {
      name: S8,
      description: "Empaqueta funnel en ZIP descargable",
      run: async (payload, ctx) => {
        const design = designProxyFromStoreArchitecture(stepResult(ctx, S2), payload);
        const { clientName } = eliteCommonIntakeStrings(payload);
        const files = buildFunnelFiles(stepResult(ctx, S3), design, clientName);
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
 * Funnel multi-paso premium: ciclo de CRO + HTML real.
 *
 * Importaba los SEIS prompts de ecommerce enteros. Las descripciones de sus
 * pasos hablaban de embudo y la instruccion que llegaba al modelo decia
 * «arquitectura de la tienda». Un servicio de conversion ejecutando el proceso
 * de montar una tienda.
 *
 * Ahora ejecuta el suyo, con el mismo numero de llamadas al modelo: el coste por
 * trabajo no cambia, cambia la disciplina.
 */
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
