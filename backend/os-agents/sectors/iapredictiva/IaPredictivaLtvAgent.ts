import type { ILlmClient } from "../../LlmClient";
import type { IaPredictivaInput, IaPredictivaOutput } from "./shared";
import { getDefaultIaPredictivaLlm, runIaPredictivaAgentCore } from "./shared";

const AGENT_ID = "iapredictiva-ltv";

let inst: IaPredictivaLtvAgent | null = null;

export class IaPredictivaLtvAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): IaPredictivaLtvAgent {
    if (!inst) inst = new IaPredictivaLtvAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIaPredictivaLlm();
  }

  async run(input: IaPredictivaInput): Promise<IaPredictivaOutput> {
    const eliteRole = "Eres **IaPredictiva LTV** — valor vitalicio con supuestos.";
    const mission =
      "Define **predicción LTV** por cliente (retención, margen, cohortes, validación finance obligatoria).";
    const fewShot =
      '{"result":"Fórmula LTV + drivers","score":86,"recommendations":["CAC payback","Discount rate placeholder","Cohorte mínima"]}';
    return runIaPredictivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getIaPredictivaLtvAgent(): IaPredictivaLtvAgent {
  return IaPredictivaLtvAgent.instance();
}

export function resetIaPredictivaLtvAgentForTests(): void {
  inst = null;
}
