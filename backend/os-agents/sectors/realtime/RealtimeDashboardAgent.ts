import type { ILlmClient } from "../../LlmClient";
import type { RealtimeInput, RealtimeOutput } from "./shared";
import { getDefaultRealtimeLlm, runRealtimeAgentCore } from "./shared";

const AGENT_ID = "realtime-dashboard";

export class RealtimeDashboardAgent {
  private static inst: RealtimeDashboardAgent | undefined;

  static get instance(): RealtimeDashboardAgent {
    if (!RealtimeDashboardAgent.inst) RealtimeDashboardAgent.inst = new RealtimeDashboardAgent();
    return RealtimeDashboardAgent.inst;
  }

  static reset(): void {
    RealtimeDashboardAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRealtimeLlm();
  }

  async run(input: RealtimeInput): Promise<RealtimeOutput> {
    const eliteRole =
      "Eres **Realtime Dashboard Publisher** — tiles live cada 30 segundos.";
    const mission =
      "Actualiza **métricas del dashboard** cada **30 segundos** automáticamente; usuarios activos, conversiones/hora, revenue/hora.";
    const fewShot =
      '{"content":"30s auto-refresh live KPI tiles","score":89,"highlights":["30s refresh","Live KPIs"],"metrics":["Refresh cadence"]}';
    return runRealtimeAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getRealtimeDashboardAgent(): RealtimeDashboardAgent {
  return RealtimeDashboardAgent.instance;
}

export function resetRealtimeDashboardAgentForTests(): void {
  RealtimeDashboardAgent.reset();
}
