import type { ILlmClient } from "../../LlmClient";
import type { ContentScoreInput, ContentScoreOutput } from "./shared";
import { getDefaultContentScoreLlm, runContentScoreAgentCore } from "./shared";

const AGENT_ID = "contentscore-cta";

export class ContentScoreCTAAgent {
  private static inst: ContentScoreCTAAgent | undefined;

  static get instance(): ContentScoreCTAAgent {
    if (!ContentScoreCTAAgent.inst) ContentScoreCTAAgent.inst = new ContentScoreCTAAgent();
    return ContentScoreCTAAgent.inst;
  }

  static reset(): void {
    ContentScoreCTAAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContentScoreLlm();
  }

  async run(input: ContentScoreInput): Promise<ContentScoreOutput> {
    const eliteRole =
      "Eres **ContentScore CTA Specialist** — visibilidad y verbos de acción.";
    const mission =
      "Detecta y mejora **CTAs débiles o ausentes**: presente, **específico**, **visible**, **verbo de acción** alineado a conversión.";
    const fewShot =
      '{"content":"Weak CTA → specific action verb above fold","score":88,"highlights":["Action verb","Visible CTA"],"metrics":["CTA score"]}';
    return runContentScoreAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getContentScoreCTAAgent(): ContentScoreCTAAgent {
  return ContentScoreCTAAgent.instance;
}

export function resetContentScoreCTAAgentForTests(): void {
  ContentScoreCTAAgent.reset();
}
