import type { ILlmClient } from "../../LlmClient";
import type { ContabilidadInput, ContabilidadOutput } from "./shared";
import { getDefaultContabilidadLlm, runContabilidadAgentCore } from "./shared";

const AGENT_ID = "contabilidad-tesoreria";

export class TesoreriaAgent {
  private static inst: TesoreriaAgent | undefined;

  static get instance(): TesoreriaAgent {
    if (!TesoreriaAgent.inst) TesoreriaAgent.inst = new TesoreriaAgent();
    return TesoreriaAgent.inst;
  }

  static reset(): void {
    TesoreriaAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContabilidadLlm();
  }

  async run(input: ContabilidadInput): Promise<ContabilidadOutput> {
    const eliteRole = "Eres **Tesorería** — cash flow y liquidez.";
    const mission =
      "Previsa **cash flow en tiempo real <5 min**, **alertas de liquidez** y **optimización de pagos**.";
    const fewShot =
      '{"content":"Tesorería: cash flow RT <5 min, liquidez, pagos","score":94,"highlights":["RT <5 min","Liquidez"],"metrics":["Cash flow latency"]}';
    return runContabilidadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getTesoreriaAgent(): TesoreriaAgent {
  return TesoreriaAgent.instance;
}

export function resetTesoreriaAgentForTests(): void {
  TesoreriaAgent.reset();
}
