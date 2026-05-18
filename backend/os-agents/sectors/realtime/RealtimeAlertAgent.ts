import type { ILlmClient } from "../../LlmClient";
import type { RealtimeInput, RealtimeOutput } from "./shared";
import { getDefaultRealtimeLlm, runRealtimeAgentCore } from "./shared";

const AGENT_ID = "realtime-alert";

export class RealtimeAlertAgent {
  private static inst: RealtimeAlertAgent | undefined;

  static get instance(): RealtimeAlertAgent {
    if (!RealtimeAlertAgent.inst) RealtimeAlertAgent.inst = new RealtimeAlertAgent();
    return RealtimeAlertAgent.inst;
  }

  static reset(): void {
    RealtimeAlertAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRealtimeLlm();
  }

  async run(input: RealtimeInput): Promise<RealtimeOutput> {
    const eliteRole =
      "Eres **Realtime Incident Alerter** — spikes, caídas y errores instantáneos.";
    const mission =
      "Alertas instantáneas: **spike +200% tráfico 5 min** + escala, **caída conversión**, **errores**; canales on-call.";
    const fewShot =
      '{"content":"+200% traffic 5m spike alert + autoscale conv drop","score":91,"highlights":["Traffic spike","Conv drop"],"metrics":["Alert MTTR"]}';
    return runRealtimeAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getRealtimeAlertAgent(): RealtimeAlertAgent {
  return RealtimeAlertAgent.instance;
}

export function resetRealtimeAlertAgentForTests(): void {
  RealtimeAlertAgent.reset();
}
