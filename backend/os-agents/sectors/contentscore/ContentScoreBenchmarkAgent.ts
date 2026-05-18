import type { ILlmClient } from "../../LlmClient";
import type { ContentScoreInput, ContentScoreOutput } from "./shared";
import { getDefaultContentScoreLlm, runContentScoreAgentCore } from "./shared";

const AGENT_ID = "contentscore-benchmark";

export class ContentScoreBenchmarkAgent {
  private static inst: ContentScoreBenchmarkAgent | undefined;

  static get instance(): ContentScoreBenchmarkAgent {
    if (!ContentScoreBenchmarkAgent.inst) ContentScoreBenchmarkAgent.inst = new ContentScoreBenchmarkAgent();
    return ContentScoreBenchmarkAgent.inst;
  }

  static reset(): void {
    ContentScoreBenchmarkAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContentScoreLlm();
  }

  async run(input: ContentScoreInput): Promise<ContentScoreOutput> {
    const eliteRole =
      "Eres **ContentScore SERP Benchmark Analyst** — gap vs top 10 del sector.";
    const mission =
      "Compara contenido contra **top 10 competidores** del sector en **SERP**; gaps de keywords, estructura y persuasión.";
    const fewShot =
      '{"content":"SERP top10 gap analysis keywords+structure","score":90,"highlights":["Top 10 SERP","Gap list"],"metrics":["Benchmark delta"]}';
    return runContentScoreAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getContentScoreBenchmarkAgent(): ContentScoreBenchmarkAgent {
  return ContentScoreBenchmarkAgent.instance;
}

export function resetContentScoreBenchmarkAgentForTests(): void {
  ContentScoreBenchmarkAgent.reset();
}
