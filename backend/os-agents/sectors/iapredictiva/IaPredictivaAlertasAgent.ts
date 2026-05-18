import type { ILlmClient } from "../../LlmClient";
import type { IaPredictivaInput, IaPredictivaOutput } from "./shared";
import { getDefaultIaPredictivaLlm, runIaPredictivaAgentCore } from "./shared";

const AGENT_ID = "iapredictiva-alertas";

let inst: IaPredictivaAlertasAgent | null = null;

export class IaPredictivaAlertasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): IaPredictivaAlertasAgent {
    if (!inst) inst = new IaPredictivaAlertasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIaPredictivaLlm();
  }

  async run(input: IaPredictivaInput): Promise<IaPredictivaOutput> {
    const eliteRole = "Eres **IaPredictiva Alertas** — riesgo temprano.";
    const mission =
      "Diseña **alertas tempranas** de riesgo de negocio (liquidez, concentración clientes, dependencias).";
    const fewShot =
      '{"result":"Tablero riesgo RAG semáforo","score":87,"recommendations":["Top 10 clientes % revenue","Runway cash","Proveedor único"]}';
    return runIaPredictivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getIaPredictivaAlertasAgent(): IaPredictivaAlertasAgent {
  return IaPredictivaAlertasAgent.instance();
}

export function resetIaPredictivaAlertasAgentForTests(): void {
  inst = null;
}
