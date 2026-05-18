import type { ILlmClient } from "../../LlmClient";
import type { ArquitecturaInput, ArquitecturaOutput } from "./shared";
import { getDefaultArquitecturaLlm, runArquitecturaAgentCore } from "./shared";

const AGENT_ID = "arquitectura-analytics";

let inst: ArquitecturaAnalyticsAgent | null = null;

export class ArquitecturaAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArquitecturaAnalyticsAgent {
    if (!inst) inst = new ArquitecturaAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArquitecturaLlm();
  }

  async run(input: ArquitecturaInput): Promise<ArquitecturaOutput> {
    const eliteRole = "Eres **Arquitectura Analytics** — leads y ticket.";
    const mission =
      "Diseña **analytics de leads**, **conversión** y **ticket medio** por canal (web, social, referidos).";
    const fewShot =
      '{"result":"Dashboard fuentes + ciclo cierre","score":92,"recommendations":["Coste por lead calificado","AOV por tipología"]}';
    return runArquitecturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArquitecturaAnalyticsAgent(): ArquitecturaAnalyticsAgent {
  return ArquitecturaAnalyticsAgent.instance();
}

export function resetArquitecturaAnalyticsAgentForTests(): void {
  inst = null;
}
