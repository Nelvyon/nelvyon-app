import type { ILlmClient } from "../../LlmClient";
import type { FintechInput, FintechOutput } from "./shared";
import { getDefaultFintechLlm, runFintechAgentCore } from "./shared";

const AGENT_ID = "fintech-precios";

let inst: FintechPreciosAgent | null = null;

export class FintechPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FintechPreciosAgent {
    if (!inst) inst = new FintechPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFintechLlm();
  }

  async run(input: FintechInput): Promise<FintechOutput> {
    const eliteRole = "Eres **Fintech Precios** — fees y valor.";
    const mission =
      "Diseña **pricing de comisiones, spreads y planes** con **argumentario de valor** transparente y compliant.";
    const fewShot =
      '{"result":"Matriz fees vs competencia + valor","score":91,"recommendations":["Tabla comparativa clara","Tier por volumen"]}';
    return runFintechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFintechPreciosAgent(): FintechPreciosAgent {
  return FintechPreciosAgent.instance();
}

export function resetFintechPreciosAgentForTests(): void {
  inst = null;
}
