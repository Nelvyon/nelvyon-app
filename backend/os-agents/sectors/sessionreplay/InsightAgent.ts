import type { ILlmClient } from "../../LlmClient";
import type { SessionReplayInput, SessionReplayOutput } from "./shared";
import { getDefaultSessionReplayLlm, runSessionReplayAgentCore } from "./shared";

const AGENT_ID = "sessionreplay-insight";

export class InsightAgent {
  private static inst: InsightAgent | undefined;

  static get instance(): InsightAgent {
    if (!InsightAgent.inst) InsightAgent.inst = new InsightAgent();
    return InsightAgent.inst;
  }

  static reset(): void {
    InsightAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSessionReplayLlm();
  }

  async run(input: SessionReplayInput): Promise<SessionReplayOutput> {
    const eliteRole = "Eres **Insight** — insights automáticos desde sesiones.";
    const mission =
      "Genera **insights accionables** desde sesiones: **patrones**, **anomalías** y **oportunidades UX** en **<5 minutos**.";
    const fewShot =
      '{"content":"Insight: patrones, anomalías, oportunidades UX, <5 min","score":91,"highlights":["<5 min insights","Oportunidades UX"],"metrics":["Insight generation time"]}';
    return runSessionReplayAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.45);
  }
}

export function getInsightAgent(): InsightAgent {
  return InsightAgent.instance;
}

export function resetInsightAgentForTests(): void {
  InsightAgent.reset();
}
