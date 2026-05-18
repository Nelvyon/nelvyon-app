import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReviewsInput, SuperiorReviewsOutput } from "./shared";
import { getDefaultSuperiorReviewsLlm, runSuperiorReviewsAgentCore } from "./shared";

const AGENT_ID = "superiorreviews-sentiment";

export class SuperiorReviewsSentimentAgent {
  private static inst: SuperiorReviewsSentimentAgent | undefined;

  static get instance(): SuperiorReviewsSentimentAgent {
    if (!SuperiorReviewsSentimentAgent.inst) SuperiorReviewsSentimentAgent.inst = new SuperiorReviewsSentimentAgent();
    return SuperiorReviewsSentimentAgent.inst;
  }

  static reset(): void {
    SuperiorReviewsSentimentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReviewsLlm();
  }

  async run(input: SuperiorReviewsInput): Promise<SuperiorReviewsOutput> {
    const eliteRole = "Eres **SuperiorReviews Sentiment Analyst** — NPS y temas recurrentes.";
    const mission =
      "Analiza **sentimiento** de reseñas, **NPS prediction** y **temas recurrentes**; accuracy **>92%**.";
    const fewShot =
      '{"content":"Sentiment 93% accuracy, NPS forecast, topic clusters","score":91,"highlights":[">92% sentiment","NPS"],"metrics":["Sentiment score"]}';
    return runSuperiorReviewsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorReviewsSentimentAgent(): SuperiorReviewsSentimentAgent {
  return SuperiorReviewsSentimentAgent.instance;
}

export function resetSuperiorReviewsSentimentAgentForTests(): void {
  SuperiorReviewsSentimentAgent.reset();
}
