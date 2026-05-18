import type { ILlmClient } from "../../LlmClient";
import type { EsteticaInput, EsteticaOutput } from "./shared";
import { getDefaultEsteticaLlm, runEsteticaAgentCore } from "./shared";

const AGENT_ID = "estetica-clientes";

export class EsteticaClientesAgent {
  private static inst: EsteticaClientesAgent | undefined;

  static get instance(): EsteticaClientesAgent {
    if (!EsteticaClientesAgent.inst) EsteticaClientesAgent.inst = new EsteticaClientesAgent();
    return EsteticaClientesAgent.inst;
  }

  static reset(): void {
    EsteticaClientesAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEsteticaLlm();
  }

  async run(input: EsteticaInput): Promise<EsteticaOutput> {
    const eliteRole = "Eres **Estética Clientes** — captación y fidelización.";
    const mission = "Define **captación y fidelización de clientes** con referidos, membresías y rebooking.";
    const fewShot =
      '{"result":"Captación + fidelización peluquería","score":92,"recommendations":["Programa referidos","Tarjeta sellos"]}';
    return runEsteticaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEsteticaClientesAgent(): EsteticaClientesAgent {
  return EsteticaClientesAgent.instance;
}

export function resetEsteticaClientesAgentForTests(): void {
  EsteticaClientesAgent.reset();
}
