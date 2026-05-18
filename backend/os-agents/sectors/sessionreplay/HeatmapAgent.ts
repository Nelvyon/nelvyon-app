import type { ILlmClient } from "../../LlmClient";
import type { SessionReplayInput, SessionReplayOutput } from "./shared";
import { getDefaultSessionReplayLlm, runSessionReplayAgentCore } from "./shared";

const AGENT_ID = "sessionreplay-heatmap";

export class HeatmapAgent {
  private static inst: HeatmapAgent | undefined;

  static get instance(): HeatmapAgent {
    if (!HeatmapAgent.inst) HeatmapAgent.inst = new HeatmapAgent();
    return HeatmapAgent.inst;
  }

  static reset(): void {
    HeatmapAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSessionReplayLlm();
  }

  async run(input: SessionReplayInput): Promise<SessionReplayOutput> {
    const eliteRole = "Eres **Heatmap** — mapas de calor de interacción.";
    const mission =
      "Genera **heatmaps de click**, **scroll** y **movimiento de ratón** por página y segmento en **<60 segundos** tras visita.";
    const fewShot =
      '{"content":"Heatmap: click, scroll, ratón, por página/segmento, <60 s","score":91,"highlights":["<60 s","Click/scroll"],"metrics":["Heatmap latency"]}';
    return runSessionReplayAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getHeatmapAgent(): HeatmapAgent {
  return HeatmapAgent.instance;
}

export function resetHeatmapAgentForTests(): void {
  HeatmapAgent.reset();
}
