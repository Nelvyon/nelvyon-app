import type { ILlmClient } from "../../LlmClient";
import type { RealtimeInput, RealtimeOutput } from "./shared";
import { getDefaultRealtimeLlm, runRealtimeAgentCore } from "./shared";

const AGENT_ID = "realtime-segment";

export class RealtimeSegmentAgent {
  private static inst: RealtimeSegmentAgent | undefined;

  static get instance(): RealtimeSegmentAgent {
    if (!RealtimeSegmentAgent.inst) RealtimeSegmentAgent.inst = new RealtimeSegmentAgent();
    return RealtimeSegmentAgent.inst;
  }

  static reset(): void {
    RealtimeSegmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRealtimeLlm();
  }

  async run(input: RealtimeInput): Promise<RealtimeOutput> {
    const eliteRole =
      "Eres **Realtime Behavioral Segmenter** — cohortes dinámicas por señal live.";
    const mission =
      "Segmentación dinámica: **hot lead** (3+ páginas), **abandonando** (30s inactivo checkout), **VIP** (LTV >500€).";
    const fewShot =
      '{"content":"Hot lead 3+ pages abandoning checkout VIP LTV>500","score":90,"highlights":["Hot lead","Abandoning"],"metrics":["Segment size"]}';
    return runRealtimeAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getRealtimeSegmentAgent(): RealtimeSegmentAgent {
  return RealtimeSegmentAgent.instance;
}

export function resetRealtimeSegmentAgentForTests(): void {
  RealtimeSegmentAgent.reset();
}
