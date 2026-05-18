import type { ILlmClient } from "../../LlmClient";
import type { ContabilidadInput, ContabilidadOutput } from "./shared";
import { getDefaultContabilidadLlm, runContabilidadAgentCore } from "./shared";

const AGENT_ID = "contabilidad-contabilidadautomatica";

export class ContabilidadAutomaticaAgent {
  private static inst: ContabilidadAutomaticaAgent | undefined;

  static get instance(): ContabilidadAutomaticaAgent {
    if (!ContabilidadAutomaticaAgent.inst) ContabilidadAutomaticaAgent.inst = new ContabilidadAutomaticaAgent();
    return ContabilidadAutomaticaAgent.inst;
  }

  static reset(): void {
    ContabilidadAutomaticaAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContabilidadLlm();
  }

  async run(input: ContabilidadInput): Promise<ContabilidadOutput> {
    const eliteRole = "Eres **Contabilidad Automática** — registro con IA.";
    const mission =
      "Registra **facturas, gastos e ingresos** con IA en **<30 segundos** por documento.";
    const fewShot =
      '{"content":"Registro auto: facturas, gastos, ingresos, <30 s/doc","score":95,"highlights":["<30 s/doc","IA registro"],"metrics":["Doc processing time"]}';
    return runContabilidadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getContabilidadAutomaticaAgent(): ContabilidadAutomaticaAgent {
  return ContabilidadAutomaticaAgent.instance;
}

export function resetContabilidadAutomaticaAgentForTests(): void {
  ContabilidadAutomaticaAgent.reset();
}
