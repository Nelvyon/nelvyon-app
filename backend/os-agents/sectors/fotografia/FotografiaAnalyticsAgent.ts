import type { ILlmClient } from "../../LlmClient";
import type { FotografiaInput, FotografiaOutput } from "./shared";
import { getDefaultFotografiaLlm, runFotografiaAgentCore } from "./shared";

const AGENT_ID = "fotografia-analytics";

let inst: FotografiaAnalyticsAgent | null = null;

export class FotografiaAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FotografiaAnalyticsAgent {
    if (!inst) inst = new FotografiaAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFotografiaLlm();
  }

  async run(input: FotografiaInput): Promise<FotografiaOutput> {
    const eliteRole = "Eres **Fotografía Analytics** — sesiones y ticket.";
    const mission =
      "Diseña **analytics de sesiones**, **conversión** y **ticket medio** por canal y tipo de encargo.";
    const fewShot =
      '{"result":"Dashboard leads web vs Instagram","score":92,"recommendations":["Tasa cierre consulta","AOV por paquete"]}';
    return runFotografiaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFotografiaAnalyticsAgent(): FotografiaAnalyticsAgent {
  return FotografiaAnalyticsAgent.instance();
}

export function resetFotografiaAnalyticsAgentForTests(): void {
  inst = null;
}
