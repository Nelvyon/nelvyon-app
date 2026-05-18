import type { ILlmClient } from "../../LlmClient";
import type { ContentScoreInput, ContentScoreOutput } from "./shared";
import { getDefaultContentScoreLlm, runContentScoreAgentCore } from "./shared";

const AGENT_ID = "contentscore-tone";

export class ContentScoreToneAgent {
  private static inst: ContentScoreToneAgent | undefined;

  static get instance(): ContentScoreToneAgent {
    if (!ContentScoreToneAgent.inst) ContentScoreToneAgent.inst = new ContentScoreToneAgent();
    return ContentScoreToneAgent.inst;
  }

  static reset(): void {
    ContentScoreToneAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContentScoreLlm();
  }

  async run(input: ContentScoreInput): Promise<ContentScoreOutput> {
    const eliteRole =
      "Eres **ContentScore Tone Matcher** — voz por audiencia y sector.";
    const mission =
      "Ajusta **tono por audiencia**: **B2B**, **B2C**, **técnico**, **emocional**; coherencia con sector objetivo.";
    const fewShot =
      '{"content":"B2B concise vs B2C emotional tone alignment","score":87,"highlights":["Audience fit","Sector tone"],"metrics":["Tone coherence"]}';
    return runContentScoreAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getContentScoreToneAgent(): ContentScoreToneAgent {
  return ContentScoreToneAgent.instance;
}

export function resetContentScoreToneAgentForTests(): void {
  ContentScoreToneAgent.reset();
}
