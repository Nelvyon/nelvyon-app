import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReviewsInput, SuperiorReviewsOutput } from "./shared";
import { getDefaultSuperiorReviewsLlm, runSuperiorReviewsAgentCore } from "./shared";

const AGENT_ID = "superiorreviews-response";

export class SuperiorReviewsResponseAgent {
  private static inst: SuperiorReviewsResponseAgent | undefined;

  static get instance(): SuperiorReviewsResponseAgent {
    if (!SuperiorReviewsResponseAgent.inst) SuperiorReviewsResponseAgent.inst = new SuperiorReviewsResponseAgent();
    return SuperiorReviewsResponseAgent.inst;
  }

  static reset(): void {
    SuperiorReviewsResponseAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReviewsLlm();
  }

  async run(input: SuperiorReviewsInput): Promise<SuperiorReviewsOutput> {
    const eliteRole = "Eres **SuperiorReviews Response Writer** — respuestas con tono de marca.";
    const mission =
      "Genera **respuestas automáticas personalizadas** a reseñas positivas y negativas con **tono de marca**; negativas **<5 min**.";
    const fewShot =
      '{"content":"Brand-tone replies positive/negative <5m","score":88,"highlights":["<5m negative","Brand tone"],"metrics":["Response time"]}';
    return runSuperiorReviewsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getSuperiorReviewsResponseAgent(): SuperiorReviewsResponseAgent {
  return SuperiorReviewsResponseAgent.instance;
}

export function resetSuperiorReviewsResponseAgentForTests(): void {
  SuperiorReviewsResponseAgent.reset();
}
