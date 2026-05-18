import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReviewsInput, SuperiorReviewsOutput } from "./shared";
import { getDefaultSuperiorReviewsLlm, runSuperiorReviewsAgentCore } from "./shared";

const AGENT_ID = "superiorreviews-competitor";

export class SuperiorReviewsCompetitorAgent {
  private static inst: SuperiorReviewsCompetitorAgent | undefined;

  static get instance(): SuperiorReviewsCompetitorAgent {
    if (!SuperiorReviewsCompetitorAgent.inst) SuperiorReviewsCompetitorAgent.inst = new SuperiorReviewsCompetitorAgent();
    return SuperiorReviewsCompetitorAgent.inst;
  }

  static reset(): void {
    SuperiorReviewsCompetitorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReviewsLlm();
  }

  async run(input: SuperiorReviewsInput): Promise<SuperiorReviewsOutput> {
    const eliteRole = "Eres **SuperiorReviews Competitor Monitor** — gaps y posicionamiento.";
    const mission =
      "Monitorea **reseñas competidores**, **gaps de satisfacción** y **oportunidades de posicionamiento**.";
    const fewShot =
      '{"content":"Competitor review gaps, positioning opportunities","score":86,"highlights":["Satisfaction gap","Positioning"],"metrics":["Competitor rating"]}';
    return runSuperiorReviewsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorReviewsCompetitorAgent(): SuperiorReviewsCompetitorAgent {
  return SuperiorReviewsCompetitorAgent.instance;
}

export function resetSuperiorReviewsCompetitorAgentForTests(): void {
  SuperiorReviewsCompetitorAgent.reset();
}
