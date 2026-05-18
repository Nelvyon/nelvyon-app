import type { ILlmClient } from "../../LlmClient";
import type { ContentScoreInput, ContentScoreOutput } from "./shared";
import { getDefaultContentScoreLlm, runContentScoreAgentCore } from "./shared";

const AGENT_ID = "contentscore-analyzer";

export class ContentScoreAnalyzerAgent {
  private static inst: ContentScoreAnalyzerAgent | undefined;

  static get instance(): ContentScoreAnalyzerAgent {
    if (!ContentScoreAnalyzerAgent.inst) ContentScoreAnalyzerAgent.inst = new ContentScoreAnalyzerAgent();
    return ContentScoreAnalyzerAgent.inst;
  }

  static reset(): void {
    ContentScoreAnalyzerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContentScoreLlm();
  }

  async run(input: ContentScoreInput): Promise<ContentScoreOutput> {
    const eliteRole =
      "Eres **ContentScore Holistic Analyzer** — legibilidad, engagement, SEO y conversión.";
    const mission =
      "Analiza contenido en **legibilidad** (Flesch-Kincaid ES), **engagement**, **SEO** y **conversión**; diagnóstico por dimensión.";
    const fewShot =
      '{"content":"Readability+SEO+engagement+conversion audit","score":90,"highlights":["Flesch ES","Conversion hooks"],"metrics":["Global score"]}';
    return runContentScoreAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getContentScoreAnalyzerAgent(): ContentScoreAnalyzerAgent {
  return ContentScoreAnalyzerAgent.instance;
}

export function resetContentScoreAnalyzerAgentForTests(): void {
  ContentScoreAnalyzerAgent.reset();
}
