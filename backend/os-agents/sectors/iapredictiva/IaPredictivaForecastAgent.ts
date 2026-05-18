import type { ILlmClient } from "../../LlmClient";
import type { IaPredictivaInput, IaPredictivaOutput } from "./shared";
import { getDefaultIaPredictivaLlm, runIaPredictivaAgentCore } from "./shared";

const AGENT_ID = "iapredictiva-forecast";

let inst: IaPredictivaForecastAgent | null = null;

export class IaPredictivaForecastAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): IaPredictivaForecastAgent {
    if (!inst) inst = new IaPredictivaForecastAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIaPredictivaLlm();
  }

  async run(input: IaPredictivaInput): Promise<IaPredictivaOutput> {
    const eliteRole = "Eres **IaPredictiva Forecast** — ingresos con supuestos explícitos.";
    const mission =
      "Construye **forecast ventas/ingresos** por período (drivers, estacionalidad, escenarios base/up/down).";
    const fewShot =
      '{"result":"Pronóstico Q+2 con bandas","score":88,"recommendations":["Sensibilidad precio","Pipeline coverage","Reconciliación finance"]}';
    return runIaPredictivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getIaPredictivaForecastAgent(): IaPredictivaForecastAgent {
  return IaPredictivaForecastAgent.instance();
}

export function resetIaPredictivaForecastAgentForTests(): void {
  inst = null;
}
