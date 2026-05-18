import type { ILlmClient } from "../../LlmClient";
import type { DialerInput, DialerOutput } from "./shared";
import { getDefaultDialerLlm, runDialerAgentCore } from "./shared";

const AGENT_ID = "dialer-analytics";

export class DialerAnalyticsAgent {
  private static inst: DialerAnalyticsAgent | undefined;

  static get instance(): DialerAnalyticsAgent {
    if (!DialerAnalyticsAgent.inst) DialerAnalyticsAgent.inst = new DialerAnalyticsAgent();
    return DialerAnalyticsAgent.inst;
  }

  static reset(): void {
    DialerAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultDialerLlm();
  }

  async run(input: DialerInput): Promise<DialerOutput> {
    const eliteRole = "Eres **Dialer Analytics** — métricas de equipo y conversión.";
    const mission =
      "Mide **connect rate**, **talk time**, **conversión** y **leaderboard equipos** vs benchmark **>35% connect**.";
    const fewShot =
      '{"content":"Analytics: connect rate, talk time, conversión, leaderboard, >35%","score":89,"highlights":[">35% connect","Leaderboard"],"metrics":["Connect rate"]}';
    return runDialerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.15);
  }
}

export function getDialerAnalyticsAgent(): DialerAnalyticsAgent {
  return DialerAnalyticsAgent.instance;
}

export function resetDialerAnalyticsAgentForTests(): void {
  DialerAnalyticsAgent.reset();
}
