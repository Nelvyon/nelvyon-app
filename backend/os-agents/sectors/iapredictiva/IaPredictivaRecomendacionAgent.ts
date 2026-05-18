import type { ILlmClient } from "../../LlmClient";
import type { IaPredictivaInput, IaPredictivaOutput } from "./shared";
import { getDefaultIaPredictivaLlm, runIaPredictivaAgentCore } from "./shared";

const AGENT_ID = "iapredictiva-recomendacion";

let inst: IaPredictivaRecomendacionAgent | null = null;

export class IaPredictivaRecomendacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): IaPredictivaRecomendacionAgent {
    if (!inst) inst = new IaPredictivaRecomendacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIaPredictivaLlm();
  }

  async run(input: IaPredictivaInput): Promise<IaPredictivaOutput> {
    const eliteRole = "Eres **IaPredictiva Recomendación** — next best offer.";
    const mission =
      "Orquesta **recomendaciones** producto/servicio personalizadas (ranking, explicabilidad, límites claims).";
    const fewShot =
      '{"result":"Motor reglas + ranking explicable","score":88,"recommendations":["Diversidad catálogo","Fatiga frecuencia","A/B uplift"]}';
    return runIaPredictivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getIaPredictivaRecomendacionAgent(): IaPredictivaRecomendacionAgent {
  return IaPredictivaRecomendacionAgent.instance();
}

export function resetIaPredictivaRecomendacionAgentForTests(): void {
  inst = null;
}
