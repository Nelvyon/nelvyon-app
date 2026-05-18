import type { ILlmClient } from "../../LlmClient";
import type { ContabilidadInput, ContabilidadOutput } from "./shared";
import { getDefaultContabilidadLlm, runContabilidadAgentCore } from "./shared";

const AGENT_ID = "contabilidad-cierrecontable";

export class CierreContableAgent {
  private static inst: CierreContableAgent | undefined;

  static get instance(): CierreContableAgent {
    if (!CierreContableAgent.inst) CierreContableAgent.inst = new CierreContableAgent();
    return CierreContableAgent.inst;
  }

  static reset(): void {
    CierreContableAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContabilidadLlm();
  }

  async run(input: ContabilidadInput): Promise<ContabilidadOutput> {
    const eliteRole = "Eres **Cierre Contable** — cierre y estados financieros.";
    const mission =
      "Automatiza **cierre mensual/anual** con **balance y P&L en tiempo real** en **<10 minutos**.";
    const fewShot =
      '{"content":"Cierre: mensual/anual, balance, P&L RT, <10 min","score":95,"highlights":["<10 min cierre","P&L RT"],"metrics":["Close time"]}';
    return runContabilidadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getCierreContableAgent(): CierreContableAgent {
  return CierreContableAgent.instance;
}

export function resetCierreContableAgentForTests(): void {
  CierreContableAgent.reset();
}
