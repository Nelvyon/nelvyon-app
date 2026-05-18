import type { ILlmClient } from "../../LlmClient";
import type { ArquitecturaInput, ArquitecturaOutput } from "./shared";
import { getDefaultArquitecturaLlm, runArquitecturaAgentCore } from "./shared";

const AGENT_ID = "arquitectura-clientes";

let inst: ArquitecturaClientesAgent | null = null;

export class ArquitecturaClientesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArquitecturaClientesAgent {
    if (!inst) inst = new ArquitecturaClientesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArquitecturaLlm();
  }

  async run(input: ArquitecturaInput): Promise<ArquitecturaOutput> {
    const eliteRole = "Eres **Arquitectura Clientes** — particulares y promotores.";
    const mission =
      "Diseña **captación de clientes** particulares y **promotores** (briefing inicial, visitas, partnerships).";
    const fewShot =
      '{"result":"Embudo lead calificado + kit promotor","score":92,"recommendations":["Workshop concept","Open house virtual"]}';
    return runArquitecturaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArquitecturaClientesAgent(): ArquitecturaClientesAgent {
  return ArquitecturaClientesAgent.instance();
}

export function resetArquitecturaClientesAgentForTests(): void {
  inst = null;
}
