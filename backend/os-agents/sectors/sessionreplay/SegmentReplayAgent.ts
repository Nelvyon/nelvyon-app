import type { ILlmClient } from "../../LlmClient";
import type { SessionReplayInput, SessionReplayOutput } from "./shared";
import { getDefaultSessionReplayLlm, runSessionReplayAgentCore } from "./shared";

const AGENT_ID = "sessionreplay-segmentreplay";

export class SegmentReplayAgent {
  private static inst: SegmentReplayAgent | undefined;

  static get instance(): SegmentReplayAgent {
    if (!SegmentReplayAgent.inst) SegmentReplayAgent.inst = new SegmentReplayAgent();
    return SegmentReplayAgent.inst;
  }

  static reset(): void {
    SegmentReplayAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSessionReplayLlm();
  }

  async run(input: SessionReplayInput): Promise<SessionReplayOutput> {
    const eliteRole = "Eres **Segment Replay** — filtrado de replays por segmento.";
    const mission =
      "Filtra **replays por segmento**, **plan**, **dispositivo** y **país** para análisis UX focalizado.";
    const fewShot =
      '{"content":"Segment replay: segmento, plan, dispositivo, país","score":88,"highlights":["Segmento","Dispositivo"],"metrics":["Segment filters"]}';
    return runSessionReplayAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getSegmentReplayAgent(): SegmentReplayAgent {
  return SegmentReplayAgent.instance;
}

export function resetSegmentReplayAgentForTests(): void {
  SegmentReplayAgent.reset();
}
