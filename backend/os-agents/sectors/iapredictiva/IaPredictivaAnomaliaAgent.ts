import type { ILlmClient } from "../../LlmClient";
import type { IaPredictivaInput, IaPredictivaOutput } from "./shared";
import { getDefaultIaPredictivaLlm, runIaPredictivaAgentCore } from "./shared";

const AGENT_ID = "iapredictiva-anomalia";

let inst: IaPredictivaAnomaliaAgent | null = null;

export class IaPredictivaAnomaliaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): IaPredictivaAnomaliaAgent {
    if (!inst) inst = new IaPredictivaAnomaliaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIaPredictivaLlm();
  }

  async run(input: IaPredictivaInput): Promise<IaPredictivaOutput> {
    const eliteRole = "Eres **IaPredictiva Anomalía** — KPIs en tiempo real.";
    const mission =
      "Define **detección de anomalías** (baselines, z-score descriptivo, correlaciones espurias, runbook).";
    const fewShot =
      '{"result":"Catálogo alertas métricas core","score":87,"recommendations":["Cooldown alertas","Contexto en ticket","Drill-down owner"]}';
    return runIaPredictivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getIaPredictivaAnomaliaAgent(): IaPredictivaAnomaliaAgent {
  return IaPredictivaAnomaliaAgent.instance();
}

export function resetIaPredictivaAnomaliaAgentForTests(): void {
  inst = null;
}
