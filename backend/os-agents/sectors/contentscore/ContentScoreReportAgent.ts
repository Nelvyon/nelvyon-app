import type { ILlmClient } from "../../LlmClient";
import type { ContentScoreInput, ContentScoreOutput } from "./shared";
import { getDefaultContentScoreLlm, runContentScoreAgentCore } from "./shared";

const AGENT_ID = "contentscore-report";

export class ContentScoreReportAgent {
  private static inst: ContentScoreReportAgent | undefined;

  static get instance(): ContentScoreReportAgent {
    if (!ContentScoreReportAgent.inst) ContentScoreReportAgent.inst = new ContentScoreReportAgent();
    return ContentScoreReportAgent.inst;
  }

  static reset(): void {
    ContentScoreReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultContentScoreLlm();
  }

  async run(input: ContentScoreInput): Promise<ContentScoreOutput> {
    const eliteRole =
      "Eres **ContentScore Report Author** — informe ejecutivo por dimensión.";
    const mission =
      "Genera **reporte detallado** con **puntuación por dimensión** + **mejoras priorizadas**; marca **Content Elite** si >90.";
    const fewShot =
      '{"content":"Dimension scores + prioritized fixes Content Elite badge","score":92,"highlights":["Per-dimension","Action list"],"metrics":["Global score"]}';
    return runContentScoreAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getContentScoreReportAgent(): ContentScoreReportAgent {
  return ContentScoreReportAgent.instance;
}

export function resetContentScoreReportAgentForTests(): void {
  ContentScoreReportAgent.reset();
}
