import type { ILlmClient } from "../../LlmClient";
import type { ContentScoreInput, ContentScoreOutput } from "./shared";
import { getDefaultContentScoreLlm, runContentScoreAgentCore } from "./shared";

const AGENT_ID = "contentscore-seo";

export class ContentScoreSEOAgent {
  private static inst: ContentScoreSEOAgent | undefined;

  static get instance(): ContentScoreSEOAgent {
    if (!ContentScoreSEOAgent.inst) ContentScoreSEOAgent.inst = new ContentScoreSEOAgent();
    return ContentScoreSEOAgent.inst;
  }

  static reset(): void {
    ContentScoreSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContentScoreLlm();
  }

  async run(input: ContentScoreInput): Promise<ContentScoreOutput> {
    const eliteRole =
      "Eres **ContentScore SEO Optimizer** — keywords, densidad y jerarquía H1–H6.";
    const mission =
      "Optimiza **SEO**: **keywords**, **densidad 1–3%**, **H1 único**, **meta <160**, estructura **H1–H6**.";
    const fewShot =
      '{"content":"KW density 2.1% single H1 meta 155c","score":91,"highlights":["1-3% density","H1 unique"],"metrics":["SEO score"]}';
    return runContentScoreAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getContentScoreSEOAgent(): ContentScoreSEOAgent {
  return ContentScoreSEOAgent.instance;
}

export function resetContentScoreSEOAgentForTests(): void {
  ContentScoreSEOAgent.reset();
}
