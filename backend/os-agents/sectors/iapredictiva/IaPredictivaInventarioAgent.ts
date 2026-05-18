import type { ILlmClient } from "../../LlmClient";
import type { IaPredictivaInput, IaPredictivaOutput } from "./shared";
import { getDefaultIaPredictivaLlm, runIaPredictivaAgentCore } from "./shared";

const AGENT_ID = "iapredictiva-inventario";

let inst: IaPredictivaInventarioAgent | null = null;

export class IaPredictivaInventarioAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): IaPredictivaInventarioAgent {
    if (!inst) inst = new IaPredictivaInventarioAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIaPredictivaLlm();
  }

  async run(input: IaPredictivaInput): Promise<IaPredictivaOutput> {
    const eliteRole = "Eres **IaPredictiva Inventario** — demanda vs capacidad.";
    const mission =
      "Optimiza **inventario y recursos** por demanda prevista (SKU ABC, lead time, stock de seguridad, overstock).";
    const fewShot =
      '{"result":"Política reposición por clase","score":88,"recommendations":["S&OP cadencia","MOQ negociado","Obsolescencia"]}';
    return runIaPredictivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getIaPredictivaInventarioAgent(): IaPredictivaInventarioAgent {
  return IaPredictivaInventarioAgent.instance();
}

export function resetIaPredictivaInventarioAgentForTests(): void {
  inst = null;
}
