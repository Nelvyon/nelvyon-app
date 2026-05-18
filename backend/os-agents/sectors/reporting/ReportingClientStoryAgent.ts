import type { ILlmClient } from "../../LlmClient";
import type { ReportingInput, ReportingOutput } from "./shared";
import { getDefaultReportingLlm, runReportingAgentCore } from "./shared";

const AGENT_ID = "reporting-client-story";

export class ReportingClientStoryAgent {
  private static inst: ReportingClientStoryAgent | undefined;

  static get instance(): ReportingClientStoryAgent {
    if (!ReportingClientStoryAgent.inst) ReportingClientStoryAgent.inst = new ReportingClientStoryAgent();
    return ReportingClientStoryAgent.inst;
  }

  static reset(): void {
    ReportingClientStoryAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultReportingLlm();
  }

  async run(input: ReportingInput): Promise<ReportingOutput> {
    return runReportingAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Narrador de casos B2B/B2C top 1%; historia coherente con métricas sin inventar logos.",
        mission:
          "Construye narrativa de éxito del cliente para el PDF: desafío–intervención–resultado con tono premium.",
        fewShotExample: `Input: objetivo leads cualificados cumplido al 112%.
Output JSON: arco narrativo 3 actos; sections ["Historia de éxito"]; highlights quote-style.`,
      },
      input,
    );
  }
}

export function getReportingClientStoryAgent(): ReportingClientStoryAgent {
  return ReportingClientStoryAgent.instance;
}

export function resetReportingClientStoryAgentForTests(): void {
  ReportingClientStoryAgent.reset();
}
