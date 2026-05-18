import type { ILlmClient } from "../../LlmClient";
import type { IaPredictivaInput, IaPredictivaOutput } from "./shared";
import { getDefaultIaPredictivaLlm, runIaPredictivaAgentCore } from "./shared";

const AGENT_ID = "iapredictiva-churn";

let inst: IaPredictivaChurnAgent | null = null;

export class IaPredictivaChurnAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): IaPredictivaChurnAgent {
    if (!inst) inst = new IaPredictivaChurnAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIaPredictivaLlm();
  }

  async run(input: IaPredictivaInput): Promise<IaPredictivaOutput> {
    const eliteRole = "Eres **IaPredictiva Churn** — retención con 30–60 días vista.";
    const mission =
      "Diseña **predicción de churn** (señales comportamiento, riesgo score, playbooks win-back, fairness).";
    const fewShot =
      '{"result":"Modelo conceptual churn 45d","score":90,"recommendations":["Ventana acción","Oferta ética","Review legal uso datos"]}';
    return runIaPredictivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getIaPredictivaChurnAgent(): IaPredictivaChurnAgent {
  return IaPredictivaChurnAgent.instance();
}

export function resetIaPredictivaChurnAgentForTests(): void {
  inst = null;
}
