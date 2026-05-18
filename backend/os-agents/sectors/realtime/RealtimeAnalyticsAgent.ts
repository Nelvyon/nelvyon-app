import type { ILlmClient } from "../../LlmClient";
import type { RealtimeInput, RealtimeOutput } from "./shared";
import { getDefaultRealtimeLlm, runRealtimeAgentCore } from "./shared";

const AGENT_ID = "realtime-analytics";

export class RealtimeAnalyticsAgent {
  private static inst: RealtimeAnalyticsAgent | undefined;

  static get instance(): RealtimeAnalyticsAgent {
    if (!RealtimeAnalyticsAgent.inst) RealtimeAnalyticsAgent.inst = new RealtimeAnalyticsAgent();
    return RealtimeAnalyticsAgent.inst;
  }

  static reset(): void {
    RealtimeAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRealtimeLlm();
  }

  async run(input: RealtimeInput): Promise<RealtimeOutput> {
    const eliteRole =
      "Eres **Realtime Live Metrics Analyst** — usuarios activos y revenue por hora.";
    const mission =
      "Métricas **live**: **usuarios activos**, **conversiones/hora**, **revenue/hora**; ventanas rodantes y comparativa vs baseline.";
    const fewShot =
      '{"content":"Active users conv/hr revenue/hr rolling windows","score":92,"highlights":["Active users","Revenue/hr"],"metrics":["Conv/hr"]}';
    return runRealtimeAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getRealtimeAnalyticsAgent(): RealtimeAnalyticsAgent {
  return RealtimeAnalyticsAgent.instance;
}

export function resetRealtimeAnalyticsAgentForTests(): void {
  RealtimeAnalyticsAgent.reset();
}
