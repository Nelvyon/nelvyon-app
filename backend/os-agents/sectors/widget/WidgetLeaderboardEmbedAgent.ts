import type { ILlmClient } from "../../LlmClient";
import type { WidgetInput, WidgetOutput } from "./shared";
import { getDefaultWidgetLlm, runWidgetAgentCore } from "./shared";

const AGENT_ID = "widget-leaderboard-embed";

export class WidgetLeaderboardEmbedAgent {
  private static inst: WidgetLeaderboardEmbedAgent | undefined;

  static get instance(): WidgetLeaderboardEmbedAgent {
    if (!WidgetLeaderboardEmbedAgent.inst) WidgetLeaderboardEmbedAgent.inst = new WidgetLeaderboardEmbedAgent();
    return WidgetLeaderboardEmbedAgent.inst;
  }

  static reset(): void {
    WidgetLeaderboardEmbedAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWidgetLlm();
  }

  async run(input: WidgetInput): Promise<WidgetOutput> {
    return runWidgetAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Rankings embed engineer top 1%; datos mock del brief y fetch opcional.",
        mission:
          "Crea leaderboard embebible para rankings de resultados con tabla responsive.",
        fewShotExample:
          "Input: top campañas. Output JSON: embedCode table+CSS; previewData filas ejemplo.",
      },
      input,
      0.1,
    );
  }
}

export function getWidgetLeaderboardEmbedAgent(): WidgetLeaderboardEmbedAgent {
  return WidgetLeaderboardEmbedAgent.instance;
}

export function resetWidgetLeaderboardEmbedAgentForTests(): void {
  WidgetLeaderboardEmbedAgent.reset();
}
