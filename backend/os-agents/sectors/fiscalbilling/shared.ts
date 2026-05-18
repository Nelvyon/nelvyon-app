import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { ModelRouter } from "../../llm/ModelRouter";
import { LearningService } from "../../learning/LearningService";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
/** Países cubiertos v1 (orientativo). */
export type FiscalBillingCountryCode =
  | "ES"
  | "FR"
  | "DE"
  | "GB"
  | "IT"
  | "PT"
  | "MX"
  | "BR"
  | "CO"
  | "AR"
  | "CL"
  | "PE";

export interface FiscalBillingInput {
  userId: string;
  sector: string;
  brand: string;
  /** País fiscal (ISO-3166 alpha-2) */
  countryCode?: FiscalBillingCountryCode | string;
  /** Identificador fiscal cliente (NIF, VAT, RFC, CNPJ, RUT…) */
  taxId?: string;
  /** Indica operación B2B (reverse charge UE, etc.) */
  isB2B?: boolean;
  /** Cliente UE distinto del país emisor (orientativo) */
  isEuCrossBorder?: boolean;
  metricsBrief?: string;
  metadata?: Record<string, unknown>;
}

export interface FiscalBillingOutput {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
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

export function llmOpts(agentId: string, temperature: number): LlmOptions {
  const _routed = ModelRouter.getModel(agentId);
  return {
    ..._routed,
    model: "gpt-4.1",
    fallback: "gpt-4o",
    maxTokens: 2000,
    temperature,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseFiscalBillingLlmJson(raw: string, label: string): Omit<FiscalBillingOutput, "agentId"> {
  const p = parseJson<{ content?: unknown; score?: unknown; highlights?: unknown; metrics?: unknown }>(raw, label);
  const content = typeof p.content === "string" ? p.content : String(p.content ?? "");
  const score = clampScore(typeof p.score === "number" ? p.score : Number(p.score));
  const h = p.highlights;
  const highlights = Array.isArray(h)
    ? h.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean)
    : [];
  const m = p.metrics;
  const metrics = Array.isArray(m) ? m.map((x) => (typeof x === "string" ? x : String(x))).filter(Boolean) : [];
  return { content, score, highlights, metrics };
}

export function buildFiscalBillingPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: FiscalBillingInput;
}): string {
  const metrics = params.input.metricsBrief?.trim() ? params.input.metricsBrief.trim() : "no indicado";
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  const cc = params.input.countryCode?.toString().trim() ? String(params.input.countryCode).trim().toUpperCase() : "no indicado";
  const tid = params.input.taxId?.trim() ? params.input.taxId.trim() : "no indicado";
  const b2b = params.input.isB2B === true ? "sí" : params.input.isB2B === false ? "no" : "no indicado";
  const cross = params.input.isEuCrossBorder === true ? "sí" : params.input.isEuCrossBorder === false ? "no" : "no indicado";

  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

PROGRAMA FACTURACIÓN FISCAL POR PAÍS NELVYON (v1):
- **Países cubiertos**: España, Francia, Alemania, UK, Italia, Portugal, México, Brasil, Colombia, Argentina, Chile, Perú (orientativo; verificar normativa vigente).
- **IVA/VAT/GST orientativo**: España **21%**, UK **20%**, Brasil **~17%** (ICMS/IPI contexto), México **16%** IVA, etc.
- **España — campos obligatorios factura completa**: **NIF emisor y receptor**, **serie+número**, **base imponible**, **tipo IVA**, **cuota IVA**, **total**.
- **Reverse charge UE (B2B)**: si el cliente tiene **número VAT válido** → factura **sin IVA** con mención legal tipo **"Inversión del sujeto pasivo"** (redacción conforme normativa aplicable).
- **Kit Digital (España)**: campo adicional **"Solución digitalización"** y **código expediente** si aplica a la subvención.
- **Exenciones**: autónomos, ONG, exportación u otros supuestos — documentar criterio en salida.

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

### BRIEF
- Sector: ${params.input.sector}
- Marca / cuenta: ${params.input.brand}
- País fiscal: ${cc}
- ID fiscal (NIF/VAT/RFC/CNPJ…): ${tid}
- B2B: ${b2b}
- Cruce frontera UE (orientativo): ${cross}
- Métricas / contexto: ${metrics}
- metadata: ${meta}

MISIÓN DEL AGENTE:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"content":"documento maestro en español salvo brief","score":0-100,"highlights":["bullets"],"metrics":["líneas KPI"]}`;
}

export async function runFiscalBillingAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: FiscalBillingInput,
  temperature: number,
): Promise<FiscalBillingOutput> {
  const prompt = buildFiscalBillingPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId, temperature));
  const parsed = parseFiscalBillingLlmJson(raw, agentId);
  const out: FiscalBillingOutput = { agentId, ...parsed };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, input.sector, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultFiscalBillingLlm(): ILlmClient {
  return LlmClient.getInstance();
}
