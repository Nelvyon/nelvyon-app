import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";
import { enrichAgentContext, formatContextForPrompt } from "../../contextEnricher";
import { ELITE_V300_STANDARDS, resolveSpecialtyElitePrompt } from "../../prompts/elitePromptLibrary";

export interface SeoInput {
  userId: string;
  sector: string;
  url?: string;
  keyword: string;
  content?: string;
  competitors?: string[];
  siteUrl?: string;
  domain?: string;
  analyticsPropertyId?: string;
  googleAdsCustomerId?: string;
  metaAdAccountId?: string;
  realDataContext?: string;
}

export interface SeoOutput {
  agentId: string;
  content: string;
  score: number;
  recommendations: string[];
  keywords: string[];
}

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

export function llmOpts(agentId: string, temperature = 0.2): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2500,
    temperature,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseSeoLlmJson(raw: string, label: string): Omit<SeoOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; recommendations?: unknown; keywords?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const kw = p.keywords;
  const keywords = Array.isArray(kw)
    ? kw.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { content, score, recommendations, keywords };
}

export function buildRankPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: SeoInput;
  realDataContext?: string;
}): string {
  const url = params.input.url?.trim() ? params.input.url.trim() : "no indicada";
  const body = params.input.content?.trim()
    ? params.input.content.trim().slice(0, 12000)
    : "no proporcionado";
  const comps =
    params.input.competitors && params.input.competitors.length > 0
      ? params.input.competitors.join(", ")
      : "no indicados";

  const realBlock =
    params.realDataContext?.trim() ? `${params.realDataContext.trim()}\n\n` : "";

  return `${params.eliteRole}

${realBlock}${ELITE_V300_STANDARDS}

FRAMEWORK RANK (top 1% — SEO on-page):
- **Research**: intención de búsqueda, SERP típico y entidades; sin inventar volúmenes exactos.
- **Align**: alinear keyword primaria, H1, titulo/meta y contenido sin stuffing.
- **Nurture**: mejoras incrementales (internos, freshness, UX lector) que suman autoridad temática.
- **Knowledge**: precisión factual, fuentes citables y señales E-E-A-T donde aplique.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF OPERATIVO
- Sector: ${params.input.sector}
- Keyword foco: ${params.input.keyword}
- URL página (si aplica): ${url}
- Competidores (opcional): ${comps}
- Extracto/borrador contenido (si aplica): ${body}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin texto fuera del JSON, sin bloques markdown):
{"content":"análisis y propuesta detallada en español salvo brief","score":0-100,"recommendations":["acciones priorizadas"],"keywords":["términos/cluster sugeridos"]}`;
}

export async function runSeoAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: SeoInput,
): Promise<SeoOutput> {
  const eliteRole = resolveSpecialtyElitePrompt(
    agentId,
    { sector: input.sector, url: input.url, keyword: input.keyword },
    params.eliteRole,
  );

  let realDataContext = input.realDataContext;
  if (!realDataContext?.trim()) {
    try {
      const ctx = await enrichAgentContext(input.userId, {
        ...input,
        siteUrl: input.siteUrl ?? input.url,
        domain: input.domain ?? input.url,
      });
      realDataContext = formatContextForPrompt(ctx);
    } catch {
      realDataContext = undefined;
    }
  }

  const prompt = buildRankPrompt({
    eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
    realDataContext,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, 0.2));
  const parsed = parseSeoLlmJson(raw, agentId);
  const out: SeoOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* tests sin DB */
  }
  return out;
}

export function getDefaultSeoLlm(): ILlmClient {
  return LlmClient.getInstance();
}
