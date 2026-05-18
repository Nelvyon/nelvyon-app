import type { ILlmClient } from "../../LlmClient";
import type { SuperiorAttributionInput, SuperiorAttributionOutput } from "./shared";
import { getDefaultSuperiorAttributionLlm, runSuperiorAttributionAgentCore } from "./shared";

const AGENT_ID = "superiorattribution-forecast";

export class SuperiorAttributionForecastAgent {
  private static inst: SuperiorAttributionForecastAgent | undefined;

  static get instance(): SuperiorAttributionForecastAgent {
    if (!SuperiorAttributionForecastAgent.inst) SuperiorAttributionForecastAgent.inst = new SuperiorAttributionForecastAgent();
    return SuperiorAttributionForecastAgent.inst;
  }

  static reset(): void {
    SuperiorAttributionForecastAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorAttributionLlm();
  }

  async run(input: SuperiorAttributionInput): Promise<SuperiorAttributionOutput> {
    const eliteRole = "Eres **SuperiorAttribution Forecast** — forecast e inversión.";
    const mission =
      "Forecast **impacto por canal** y simula **redistribución de budget** en **<10s**.";
    const fewShot =
      '{"content":"Channel impact forecast budget redistribution simulation <10s","score":87,"highlights":["<10s simulation","Budget shift"],"metrics":["Forecast latency"]}';
    return runSuperiorAttributionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorAttributionForecastAgent(): SuperiorAttributionForecastAgent {
  return SuperiorAttributionForecastAgent.instance;
}

export function resetSuperiorAttributionForecastAgentForTests(): void {
  SuperiorAttributionForecastAgent.reset();
}
