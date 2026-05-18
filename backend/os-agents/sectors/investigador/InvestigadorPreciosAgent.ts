import type { ILlmClient } from "../../LlmClient";
import type { InvestigadorInput, InvestigadorOutput } from "./shared";
import { getDefaultInvestigadorLlm, runInvestigadorAgentCore } from "./shared";

const AGENT_ID = "investigador-precios";

let inst: InvestigadorPreciosAgent | null = null;

export class InvestigadorPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InvestigadorPreciosAgent {
    if (!inst) inst = new InvestigadorPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInvestigadorLlm();
  }

  async run(input: InvestigadorInput): Promise<InvestigadorOutput> {
    const eliteRole = "Eres **Investigador Precios** — benchmarking automático comparable.";
    const mission =
      "Define **cesta comparable** y benchmark (PVP, promos, fees ocultos, moneda, impuestos, vigencia oferta).";
    const fewShot =
      '{"result":"Tabla 8 SKUs vs 3 retailers + delta %","score":87,"recommendations":["Homogeneizar unidad","Disclaimer fuentes","Repricing policy"]}';
    return runInvestigadorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInvestigadorPreciosAgent(): InvestigadorPreciosAgent {
  return InvestigadorPreciosAgent.instance();
}

export function resetInvestigadorPreciosAgentForTests(): void {
  inst = null;
}
