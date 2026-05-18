import type { ILlmClient } from "../../LlmClient";
import type { ContentScoreInput, ContentScoreOutput } from "./shared";
import { getDefaultContentScoreLlm, runContentScoreAgentCore } from "./shared";

const AGENT_ID = "contentscore-rank";

export class ContentScoreRankAgent {
  private static inst: ContentScoreRankAgent | undefined;

  static get instance(): ContentScoreRankAgent {
    if (!ContentScoreRankAgent.inst) ContentScoreRankAgent.inst = new ContentScoreRankAgent();
    return ContentScoreRankAgent.inst;
  }

  static reset(): void {
    ContentScoreRankAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContentScoreLlm();
  }

  async run(input: ContentScoreInput): Promise<ContentScoreOutput> {
    const eliteRole =
      "Eres **ContentScore Dimension Ranker** — scoring 0–100 por eje de calidad.";
    const mission =
      "Puntúa **0–100** por dimensión: **claridad**, **persuasión**, **SEO**, **CTA**; agrega global y reglas <70 rewrite / >90 Content Elite.";
    const fewShot =
      '{"content":"Clarity 82 Persuasion 76 SEO 88 CTA 71","score":79,"highlights":["Per-dimension","Elite gate"],"metrics":["CTA score"]}';
    return runContentScoreAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getContentScoreRankAgent(): ContentScoreRankAgent {
  return ContentScoreRankAgent.instance;
}

export function resetContentScoreRankAgentForTests(): void {
  ContentScoreRankAgent.reset();
}
