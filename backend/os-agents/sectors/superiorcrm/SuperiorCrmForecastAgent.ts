import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCrmInput, SuperiorCrmOutput } from "./shared";
import { getDefaultSuperiorCrmLlm, runSuperiorCrmAgentCore } from "./shared";

const AGENT_ID = "superiorcrm-forecast";

export class SuperiorCrmForecastAgent {
  private static inst: SuperiorCrmForecastAgent | undefined;

  static get instance(): SuperiorCrmForecastAgent {
    if (!SuperiorCrmForecastAgent.inst) SuperiorCrmForecastAgent.inst = new SuperiorCrmForecastAgent();
    return SuperiorCrmForecastAgent.inst;
  }

  static reset(): void {
    SuperiorCrmForecastAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCrmLlm();
  }

  async run(input: SuperiorCrmInput): Promise<SuperiorCrmOutput> {
    const eliteRole = "Eres **SuperiorCrm Revenue Forecaster** — ML y escenarios.";
    const mission =
      "**Forecasting de ingresos ML**, análisis histórico y escenarios **best/base/worst**; accuracy **>92%**.";
    const fewShot =
      '{"content":"ML forecast 93% accuracy, best/base/worst scenarios","score":92,"highlights":[">92% accuracy","Scenarios"],"metrics":["Forecast accuracy"]}';
    return runSuperiorCrmAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorCrmForecastAgent(): SuperiorCrmForecastAgent {
  return SuperiorCrmForecastAgent.instance;
}

export function resetSuperiorCrmForecastAgentForTests(): void {
  SuperiorCrmForecastAgent.reset();
}
