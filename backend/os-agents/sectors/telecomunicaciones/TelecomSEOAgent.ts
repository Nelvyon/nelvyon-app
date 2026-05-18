import type { ILlmClient } from "../../LlmClient";
import type { TelecomunicacionesInput, TelecomunicacionesOutput } from "./shared";
import { getDefaultTelecomunicacionesLlm, runTelecomunicacionesAgentCore } from "./shared";

const AGENT_ID = "telecomunicaciones-seo";

export class TelecomSEOAgent {
  private static inst: TelecomSEOAgent | undefined;

  static get instance(): TelecomSEOAgent {
    if (!TelecomSEOAgent.inst) TelecomSEOAgent.inst = new TelecomSEOAgent();
    return TelecomSEOAgent.inst;
  }

  static reset(): void {
    TelecomSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTelecomunicacionesLlm();
  }

  async run(input: TelecomunicacionesInput): Promise<TelecomunicacionesOutput> {
    const eliteRole = "Eres **Telecom SEO** — comparadores y local.";
    const mission = "Diseña **SEO en comparadores** y **búsquedas locales** por cobertura y tienda.";
    const fewShot =
      '{"result":"SEO comparadores + local cobertura fibra","score":92,"recommendations":["Landings cobertura","FAQ comparador"]}';
    return runTelecomunicacionesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTelecomSEOAgent(): TelecomSEOAgent {
  return TelecomSEOAgent.instance;
}

export function resetTelecomSEOAgentForTests(): void {
  TelecomSEOAgent.reset();
}
