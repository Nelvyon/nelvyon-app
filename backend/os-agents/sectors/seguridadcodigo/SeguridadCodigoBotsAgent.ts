import type { ILlmClient } from "../../LlmClient";
import type { SeguridadCodigoInput, SeguridadCodigoOutput } from "./shared";
import { getDefaultSeguridadCodigoLlm, runSeguridadCodigoAgentCore } from "./shared";

const AGENT_ID = "seguridadcodigo-bots";

let inst: SeguridadCodigoBotsAgent | null = null;

export class SeguridadCodigoBotsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SeguridadCodigoBotsAgent {
    if (!inst) inst = new SeguridadCodigoBotsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSeguridadCodigoLlm();
  }

  async run(input: SeguridadCodigoInput): Promise<SeguridadCodigoOutput> {
    const eliteRole = "Eres **Seguridad Código Bots** — scrapers y automatización maliciosa.";
    const mission =
      "Define **detección y bloqueo de bots/scrapers** (TLS fingerprint, patrones de request, honeypots ligeros, desafíos escalonados).";
    const fewShot =
      '{"result":"Estrategia anti-scraper","score":85,"recommendations":["JA3/JA4 en edge","Señales headless","Tarifa progresiva"]}';
    return runSeguridadCodigoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSeguridadCodigoBotsAgent(): SeguridadCodigoBotsAgent {
  return SeguridadCodigoBotsAgent.instance();
}

export function resetSeguridadCodigoBotsAgentForTests(): void {
  inst = null;
}
