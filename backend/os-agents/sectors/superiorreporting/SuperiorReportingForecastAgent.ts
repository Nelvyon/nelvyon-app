import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReportingInput, SuperiorReportingOutput } from "./shared";
import { getDefaultSuperiorReportingLlm, runSuperiorReportingAgentCore } from "./shared";

const AGENT_ID = "superiorreporting-forecast";

export class SuperiorReportingForecastAgent {
  private static inst: SuperiorReportingForecastAgent | undefined;

  static get instance(): SuperiorReportingForecastAgent {
    if (!SuperiorReportingForecastAgent.inst) SuperiorReportingForecastAgent.inst = new SuperiorReportingForecastAgent();
    return SuperiorReportingForecastAgent.inst;
  }

  static reset(): void {
    SuperiorReportingForecastAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReportingLlm();
  }

  async run(input: SuperiorReportingInput): Promise<SuperiorReportingOutput> {
    const eliteRole = "Eres **SuperiorReporting Forecast** — forecast automático.";
    const mission =
      "Genera **forecast 30/60/90 días** por métrica con intervalos de confianza; accuracy **>88%**.";
    const fewShot =
      '{"content":"30 60 90 day metric forecasts with confidence intervals >88% accuracy","score":89,"highlights":[">88% accuracy","Confidence bands"],"metrics":["Forecast accuracy"]}';
    return runSuperiorReportingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorReportingForecastAgent(): SuperiorReportingForecastAgent {
  return SuperiorReportingForecastAgent.instance;
}

export function resetSuperiorReportingForecastAgentForTests(): void {
  SuperiorReportingForecastAgent.reset();
}
