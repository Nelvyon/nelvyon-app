import type { ILlmClient } from "../../LlmClient";
import type { HrTechInput, HrTechOutput } from "./shared";
import { getDefaultHrTechLlm, runHrTechAgentCore } from "./shared";

const AGENT_ID = "hrtech-hranalytics";

export class HRAnalyticsAgent {
  private static inst: HRAnalyticsAgent | undefined;

  static get instance(): HRAnalyticsAgent {
    if (!HRAnalyticsAgent.inst) HRAnalyticsAgent.inst = new HRAnalyticsAgent();
    return HRAnalyticsAgent.inst;
  }

  static reset(): void {
    HRAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHrTechLlm();
  }

  async run(input: HrTechInput): Promise<HrTechOutput> {
    const eliteRole = "Eres **HR Analytics** — métricas de talento.";
    const mission =
      "Analiza **turnover, time-to-hire, coste por contratación y LTV empleado**.";
    const fewShot =
      '{"content":"HR analytics: turnover, TTH, coste hire, LTV empleado","score":94,"highlights":["Turnover","LTV empleado"],"metrics":["Time-to-hire"]}';
    return runHrTechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getHRAnalyticsAgent(): HRAnalyticsAgent {
  return HRAnalyticsAgent.instance;
}

export function resetHRAnalyticsAgentForTests(): void {
  HRAnalyticsAgent.reset();
}
