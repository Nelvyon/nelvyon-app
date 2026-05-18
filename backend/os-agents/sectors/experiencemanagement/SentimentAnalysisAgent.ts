import type { ILlmClient } from "../../LlmClient";
import type { ExperienceManagementInput, ExperienceManagementOutput } from "./shared";
import { getDefaultExperienceManagementLlm, runExperienceManagementAgentCore } from "./shared";

const AGENT_ID = "experiencemanagement-sentimentanalysis";

export class SentimentAnalysisAgent {
  private static inst: SentimentAnalysisAgent | undefined;

  static get instance(): SentimentAnalysisAgent {
    if (!SentimentAnalysisAgent.inst) SentimentAnalysisAgent.inst = new SentimentAnalysisAgent();
    return SentimentAnalysisAgent.inst;
  }

  static reset(): void {
    SentimentAnalysisAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultExperienceManagementLlm();
  }

  async run(input: ExperienceManagementInput): Promise<ExperienceManagementOutput> {
    const eliteRole = "Eres **Sentiment Analysis** — sentimiento multicanal en tiempo real.";
    const mission =
      "Analiza **sentimiento multicanal** en tiempo real y **trending topics**; procesamiento **<30 segundos** por feedback.";
    const fewShot =
      '{"content":"Sentiment: multicanal RT, trending topics, <30 s/feedback","score":91,"highlights":["<30 s","Trending topics"],"metrics":["Sentiment latency"]}';
    return runExperienceManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getSentimentAnalysisAgent(): SentimentAnalysisAgent {
  return SentimentAnalysisAgent.instance;
}

export function resetSentimentAnalysisAgentForTests(): void {
  SentimentAnalysisAgent.reset();
}
