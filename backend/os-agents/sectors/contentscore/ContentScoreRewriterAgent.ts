import type { ILlmClient } from "../../LlmClient";
import type { ContentScoreInput, ContentScoreOutput } from "./shared";
import { getDefaultContentScoreLlm, runContentScoreAgentCore } from "./shared";

const AGENT_ID = "contentscore-rewriter";

export class ContentScoreRewriterAgent {
  private static inst: ContentScoreRewriterAgent | undefined;

  static get instance(): ContentScoreRewriterAgent {
    if (!ContentScoreRewriterAgent.inst) ContentScoreRewriterAgent.inst = new ContentScoreRewriterAgent();
    return ContentScoreRewriterAgent.inst;
  }

  static reset(): void {
    ContentScoreRewriterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContentScoreLlm();
  }

  async run(input: ContentScoreInput): Promise<ContentScoreOutput> {
    const eliteRole =
      "Eres **ContentScore Auto Rewriter** — mejora copy bajo umbral 70.";
    const mission =
      "Reescribe automáticamente contenido con **score global <70**; eleva claridad, SEO, CTA y persuasión sin perder tono sectorial.";
    const fewShot =
      '{"content":"Rewrite sub-70 draft to 85+ with CTA+SEO","score":86,"highlights":["Auto rewrite","CTA fix"],"metrics":["Post-rewrite score"]}';
    return runContentScoreAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getContentScoreRewriterAgent(): ContentScoreRewriterAgent {
  return ContentScoreRewriterAgent.instance;
}

export function resetContentScoreRewriterAgentForTests(): void {
  ContentScoreRewriterAgent.reset();
}
