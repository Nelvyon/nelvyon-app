import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { enrichAgentContext, formatContextForPrompt } from "../../contextEnricher";
import { ELITE_V300_STANDARDS, resolveEliteSystemPrompt } from "../../prompts/elitePromptLibrary";

export interface AdsInput {
  userId: string;
  businessContext: string;
  agentId: string;
  siteUrl?: string;
  domain?: string;
  url?: string;
  analyticsPropertyId?: string;
  googleAdsCustomerId?: string;
  metaAdAccountId?: string;
  realDataContext?: string;
}

export interface AdsOutput {
  result: string;
  insights: string[];
  recommendedActions: string[];
}

export const adsLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.5,
  maxTokens: 1500,
};

const ADS_OS_RULES = `Eres el agente de **gestión de publicidad de pago** de NELVYON OS.
- Gestionas y optimizas campañas en **Google Ads**, **Meta Ads**, **TikTok Ads**, **LinkedIn Ads** y **programática**.
- Realizas **keyword research** avanzado, diseñas estructuras de campañas, optimizas pujas con **Smart Bidding**, creas **audiencias personalizadas y lookalike**, analizas **attribution multi-touch**, optimizas **landing pages** para **Quality Score**, detectas **ad fatigue** y **rotación creativa**, y maximizas **ROAS** con presupuestos mínimos.
- Calidad enterprise, **sin agencia**.`;

function parseJson<T>(raw: string, label: string): T {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(`${label}: JSON inválido`);
  }
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

export function parseAdsLlmJson(raw: string, label: string): AdsOutput {
  const p = parseJson<{ result?: unknown; insights?: unknown; recommendedActions?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  return {
    result,
    insights: parseStringArray(p.insights),
    recommendedActions: parseStringArray(p.recommendedActions),
  };
}

export function buildAdsPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: AdsInput;
  realDataContext?: string;
}): string {
  const ctx = params.input.businessContext.trim() || "no indicado";
  const realBlock =
    params.realDataContext?.trim() ? `${params.realDataContext.trim()}\n\n` : "";

  return `${params.eliteRole}

${realBlock}${ELITE_V300_STANDARDS}

${ADS_OS_RULES}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### CONTEXTO DE NEGOCIO
${ctx}

MISIÓN DEL AGENTE (${params.input.agentId}):
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español","insights":["bullets insight"],"recommendedActions":["acciones concretas"]}`;
}

type AgentPromptBlock = { eliteRole: string; mission: string; fewShotExample: string };

function getAdsAgentPromptBlock(agentId: string): AgentPromptBlock {
  switch (agentId) {
    case "ads-estrategia":
      return {
        eliteRole: "Eres **Ads Estrategia** — arquitectura paid omnicanal.",
        mission:
          "**Diseña** estrategia omnicanal de paid media (objetivos, mix de canales, presupuestos, fases de escala, riesgos y KPIs).",
        fewShotExample:
          '{"result":"Plan 90d: Google+Meta+TikTok con fases","insights":["Awareness en TikTok + captación en Search","Presupuesto mínimo viable por canal"],"recommendedActions":["Matriz mensaje × etapa funnel","Revisión semanal de mix"]}',
      };
    case "ads-google":
      return {
        eliteRole: "Eres **Ads Google** — Search, PMAX y Demand Gen.",
        mission:
          "**Gestiona y optimiza** campañas Google Ads (estructura SKAG/ thematic, negativas, RSAs, PMAX feeds, conversion tracking).",
        fewShotExample:
          '{"result":"Estructura 3 campañas + lista negativas","insights":["Smart Bidding necesita volumen conversiones","Search intent > display genérico"],"recommendedActions":["Consolidar conversiones duplicadas","Experimentos URL final"]}',
      };
    case "ads-meta":
      return {
        eliteRole: "Eres **Ads Meta** — Facebook e Instagram.",
        mission:
          "**Gestiona y optimiza** campañas Meta Ads (Advantage+, catálogos, creatives, CAPI, event match quality, asc).",
        fewShotExample:
          '{"result":"Funnel Advantage+ con 4 ad sets lógicos","insights":["Broad + señales de primera parte mejora learning","Creative testing batch semanal"],"recommendedActions":["CAPI server-side audit","Reglas automatización fatiga"]}',
      };
    case "ads-tiktok":
      return {
        eliteRole: "Eres **Ads TikTok** — Spark Ads y contenido nativo.",
        mission:
          "**Gestiona y optimiza** campañas TikTok Ads (hooks, Spark, identidad creativa, bidding, medición SKAN/web).",
        fewShotExample:
          '{"result":"Brief 6 hooks + 2 Spark concepts","insights":["Primer 2s define retención","UGC auténtico > polish excesivo"],"recommendedActions":["Creative fatigue dashboard","Pixel + Events API"]}',
      };
    case "ads-audiencias":
      return {
        eliteRole: "Eres **Ads Audiencias** — datos propios y modelos de plataforma.",
        mission:
          "**Crea** audiencias personalizadas y lookalike (LAL seed quality, exclusión, overlap, consentimiento).",
        fewShotExample:
          '{"result":"3 custom audiences + 2 LAL 1-3%","insights":["Seed purchasers 180d > all visitors","Excluir churn por señal CRM"],"recommendedActions":["Audience expansion controlada","QA overlap entre ad sets"]}',
      };
    case "ads-creatividades":
      return {
        eliteRole: "Eres **Ads Creatividades** — rendimiento y frescura.",
        mission:
          "**Optimiza** rotación creativa y **detecta** ad fatigue (frecuencia, CTR decay, thumb-stop, hooks).",
        fewShotExample:
          '{"result":"Calendario rotación + umbrales alerta","insights":["3-5 winners por funnel stage","Fatiga antes en remarketing"],"recommendedActions":["Kill rules por CPA/ROAS","Bank de hooks reutilizables"]}',
      };
    case "ads-attribution":
      return {
        eliteRole: "Eres **Ads Attribution** — MTA y ROAS real.",
        mission:
          "**Analiza** attribution multi-touch y ROAS real (ventanas, incrementality mindset, discrepancies platform vs GA4/warehouse).",
        fewShotExample:
          '{"result":"Mapa touchpoints + ventana recomendada","insights":["Last-click subestima upper funnel","Holdout tests para lift"],"recommendedActions":["Unificar definición conversión","Modelo de credito documentado"]}',
      };
    case "ads-optimizacion":
      return {
        eliteRole: "Eres **Ads Optimización** — pujas, QS y destinos.",
        mission:
          "**Optimiza** pujas, Quality Score y landing pages (relevancia anuncio, velocidad, alineación intención, post-click).",
        fewShotExample:
          '{"result":"Checklist QS + 5 fixes landing","insights":["Above-the-fold CTA alineado con keyword","CLS bajo mejora conversión"],"recommendedActions":["Test LP por intención","Ajuste pujas por device"]}',
      };
    default:
      throw new Error(`${agentId}: agente no soportado`);
  }
}

export async function runAdsAgentCore(agentId: string, input: AdsInput, llm: ILlmClient): Promise<AdsOutput> {
  const block = getAdsAgentPromptBlock(agentId);
  const eliteRole = resolveEliteSystemPrompt(
    agentId,
    { sector: "publicidad", businessContext: input.businessContext, businessName: input.businessContext },
    block.eliteRole,
  );

  let realDataContext = input.realDataContext;
  if (!realDataContext?.trim()) {
    try {
      const ctx = await enrichAgentContext(input.userId, {
        ...input,
        siteUrl: input.siteUrl ?? input.url,
        domain: input.domain,
      });
      realDataContext = formatContextForPrompt(ctx);
    } catch {
      realDataContext = undefined;
    }
  }

  const prompt = buildAdsPrompt({
    eliteRole,
    mission: block.mission,
    fewShotExample: block.fewShotExample,
    input: { ...input, agentId },
    realDataContext,
  });
  const raw = await llm.complete(prompt, adsLlmOpts);
  const out = parseAdsLlmJson(raw, agentId);
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "ads", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultAdsLlm(): ILlmClient {
  return LlmClient.getInstance();
}
