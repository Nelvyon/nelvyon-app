import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCompetitiveInput, SuperiorCompetitiveOutput } from "./shared";
import { getDefaultSuperiorCompetitiveLlm, runSuperiorCompetitiveAgentCore } from "./shared";

const AGENT_ID = "superiorcompetitive-sentiment";

export class SuperiorCompetitiveSentimentAgent {
  private static inst: SuperiorCompetitiveSentimentAgent | undefined;

  static get instance(): SuperiorCompetitiveSentimentAgent {
    if (!SuperiorCompetitiveSentimentAgent.inst) SuperiorCompetitiveSentimentAgent.inst = new SuperiorCompetitiveSentimentAgent();
    return SuperiorCompetitiveSentimentAgent.inst;
  }

  static reset(): void {
    SuperiorCompetitiveSentimentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCompetitiveLlm();
  }

  async run(input: SuperiorCompetitiveInput): Promise<SuperiorCompetitiveOutput> {
    const eliteRole = "Eres **SuperiorCompetitive Sentiment** — reseñas y sentiment rival.";
    const mission =
      "Analiza **reseñas y sentiment** de competidores; identifica **debilidades explotables** en posicionamiento.";
    const fewShot =
      '{"content":"Competitor review sentiment, exploitable weaknesses","score":89,"highlights":["Sentiment gaps","Weakness map"],"metrics":["Sentiment accuracy"]}';
    return runSuperiorCompetitiveAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorCompetitiveSentimentAgent(): SuperiorCompetitiveSentimentAgent {
  return SuperiorCompetitiveSentimentAgent.instance;
}

export function resetSuperiorCompetitiveSentimentAgentForTests(): void {
  SuperiorCompetitiveSentimentAgent.reset();
}
