import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
export interface CryptoInput {
  userId: string;
  businessName: string;
  services: string[];
  targets: string[];
}

export interface CryptoOutput {
  agentId: string;
  result: string;
  score: number;
  recommendations: string[];
}

export const cryptoLlmOpts: LlmOptions = {
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 1200,
};

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

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseCryptoLlmJson(raw: string, label: string): Omit<CryptoOutput, "agentId"> {
  const p = parseJson<{ result?: unknown; score?: unknown; recommendations?: unknown }>(raw, label);
  const result = typeof p.result === "string" ? p.result : String(p.result ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const rec = p.recommendations;
  const recommendations = Array.isArray(rec)
    ? rec.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  return { result, score, recommendations };
}

export function buildCryptoPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: CryptoInput;
}): string {
  const services = params.input.services.length > 0 ? params.input.services.join(", ") : "no indicado";
  const targets = params.input.targets.length > 0 ? params.input.targets.join(", ") : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

CRYPTO / WEB3 NELVYON OS (v1):
- Sector crypto y Web3: protocolos DeFi, colecciones y utilidad NFT, DAOs y gobernanza, exchanges y brokers CEX/DEX, wallets y custodia, launchpads e IBCO/IDO, infraestructura blockchain y tooling para builders.
- Construcción de comunidad (Discord, Telegram, X), estrategia de lanzamiento de token/NFT/proyecto, tokenomics y propuesta de valor, SEO y contenido Web3, growth en redes, newsletters, reputación y trust, analytics de holders, wallets activas y TVL (sin promesas de rentabilidad, sin asesoramiento de inversión ni incentivos a eludir normativa aplicable).

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Proyecto / negocio: ${params.input.businessName}
- Servicios / stack: ${services}
- Audiencias / targets: ${targets}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"result":"documento maestro en español salvo brief","score":0-100,"recommendations":["bullets accionables"]}`;
}

export async function runCryptoAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: CryptoInput,
): Promise<CryptoOutput> {
  const prompt = buildCryptoPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, cryptoLlmOpts);
  const parsed = parseCryptoLlmJson(raw, agentId);
  const out: CryptoOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, "crypto", input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultCryptoLlm(): ILlmClient {
  return LlmClient.getInstance();
}
