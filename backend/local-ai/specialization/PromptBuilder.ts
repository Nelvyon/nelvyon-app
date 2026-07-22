import { CONSTITUTION_RULES } from "./constitution";
import type { RagRetrievalResult } from "../LocalRagRetriever";
import { planOutputSkeleton } from "./PlanTemplate";
import { requiresStrategyTemplate, strategyTemplateForDomain } from "./DomainStrategyTemplates";
import { buildStrategySystemExtension } from "./StrategyPromptBuilder";
import { extractVerifiedFacts, formatVerifiedFactsBlock } from "./ContextFactExtractor";
import type { KnowledgeDomainId } from "./ontology";

function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export type BuiltPrompt = {
  system: string;
  user: string;
  fullPrompt: string;
  contextChars: number;
  citationCount: number;
  hasContext: boolean;
};

export function buildSpecializationPrompt(
  query: string,
  retrieval: RagRetrievalResult,
  opts?: {
    requireJson?: boolean;
    requirePlan?: boolean;
    requireCitations?: boolean;
    domain?: KnowledgeDomainId;
    gateCategory?: string;
    difficulty?: string;
  },
): BuiltPrompt {
  const hasContext = retrieval.citations.length > 0;

  let system = `${CONSTITUTION_RULES.systemPromptPrefix}

INSTRUCCIONES DE RAZONAMIENTO:
1. Lee TODAS las FUENTES AUTORIZADAS antes de responder.
2. Extrae datos relevantes y cítalos [1], [2]…
3. Responde en español (España) de forma directa y profesional.
4. Si las FUENTES AUTORIZADAS contienen la respuesta, está PROHIBIDO afirmar que no tienes información.`;

  const domain = opts?.domain;
  if (domain && opts?.gateCategory === "strategy") {
    system += `\n\n${buildStrategySystemExtension(query, domain, opts.difficulty)}`;
  } else if (domain && opts?.gateCategory && requiresStrategyTemplate(domain, opts.gateCategory)) {
    const tpl = strategyTemplateForDomain(domain);
    if (tpl) system += `\n\n${tpl}`;
  }

  if (opts?.requireJson) {
    system +=
      "\n\nMODO JSON ESTRICTO: Responde ÚNICAMENTE con un objeto JSON válido. Sin markdown. Sin texto antes ni después.\nSchema obligatorio: {\"tool\":\"create_campaign\",\"args\":{\"name\":\"string\",\"budget_eur\":number,\"channels\":[\"string\"]}}";
  } else if (opts?.requirePlan) {
    system +=
      "\n\nMODO PLAN ESTRUCTURADO: Completa las 16 secciones con encabezados ##. Cada sección mínimo 2 frases sustantivas.";
  }

  if (opts?.requireCitations || (!opts?.requireJson && !opts?.requirePlan && hasContext)) {
    system +=
      "\n\nCITAS OBLIGATORIAS: Toda afirmación factual debe incluir [N] referenciando FUENTES AUTORIZADAS. Al final incluye ## Fuentes utilizadas listando qué [N] usaste.";
  }

  if (opts?.gateCategory === "nelvyon" || opts?.domain === "development_tech" || opts?.domain === "saas") {
    system +=
      "\n\nMODO CONOCIMIENTO NELVYON: Responde directo con datos del producto oficial. No escribas nombres literales de variables de entorno (JWT_SECRET, STRIPE_SECRET, DATABASE_URL); usa descripciones genéricas.";
  }
  if (opts?.domain === "copywriting") {
    system +=
      "\n\nCOPY B2B: Prohibido 100% garantizado, ROI garantizado, +300%, mejores del mundo. Tono profesional sin hype.";
  }

  const rules = opts?.requireJson
    ? [
        "JSON puro sin markdown.",
        'Schema: {"tool":"create_campaign","args":{"name":"...","budget_eur":1500,"channels":["email"]}}',
        "args.name, args.budget_eur y args.channels son obligatorios.",
      ]
    : hasContext
      ? [
          "Responde SOLO con datos de FUENTES AUTORIZADAS.",
          "Prohibido 'no tengo información' / 'no se proporcionó contexto' si hay fuentes arriba.",
          "Explica qué fuente [N] sustenta cada afirmación clave.",
          "Incluye al menos una cita [N] cuando afirmes datos de NELVYON.",
        ]
      : ["No inventes datos de NELVYON.", "Confianza baja obligatoria."];

  const verifiedFacts =
    hasContext && !opts?.requireJson
      ? formatVerifiedFactsBlock(extractVerifiedFacts(query, retrieval.citations))
      : "";

  const contextBlock = hasContext && !opts?.requireJson
    ? `${verifiedFacts}FUENTES AUTORIZADAS (responde ÚNICAMENTE con estas fuentes — cita [1], [2]…):\n${retrieval.contextBlock}`
    : opts?.requireJson && hasContext
      ? `CONTEXTO (referencia schema):\n${retrieval.contextBlock.slice(0, 2000)}`
      : hasContext
        ? `FUENTES AUTORIZADAS (responde ÚNICAMENTE con estas fuentes — cita [1], [2]…):\n${retrieval.contextBlock}`
        : "FUENTES AUTORIZADAS: (vacío — indica confianza baja y datos faltantes; no inventes)";

  let userQuery = query;
  if (opts?.requirePlan && query.includes("##")) {
    userQuery = `${query}\n\nPlantilla de referencia:\n${planOutputSkeleton()}`;
  }

  const user = `${contextBlock}\n\nPREGUNTA: ${userQuery}\n\nREGLAS:\n${rules.map((r) => `- ${r}`).join("\n")}`;

  return {
    system,
    user,
    fullPrompt: `SYSTEM:\n${system}\n\nUSER:\n${user}`,
    contextChars: retrieval.contextBlock.length,
    citationCount: retrieval.citations.length,
    hasContext,
  };
}

/** Exposed for tests — adversarial detection moved to SecurityGuard (pre-LLM). */
export function isAdversarialQuery(query: string): boolean {
  return /ignora reglas|jwt_secret|database_url|sk_live|exporta tenant|prompt injection|olvida constitucion|\[system:/i.test(
    normalizeQuery(query),
  );
}
