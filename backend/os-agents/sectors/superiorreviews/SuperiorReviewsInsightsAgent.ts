import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReviewsInput, SuperiorReviewsOutput } from "./shared";
import { getDefaultSuperiorReviewsLlm, runSuperiorReviewsAgentCore } from "./shared";

const AGENT_ID = "superiorreviews-insights";

export class SuperiorReviewsInsightsAgent {
  private static inst: SuperiorReviewsInsightsAgent | undefined;

  static get instance(): SuperiorReviewsInsightsAgent {
    if (!SuperiorReviewsInsightsAgent.inst) SuperiorReviewsInsightsAgent.inst = new SuperiorReviewsInsightsAgent();
    return SuperiorReviewsInsightsAgent.inst;
  }

  static reset(): void {
    SuperiorReviewsInsightsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReviewsLlm();
  }

  async run(input: SuperiorReviewsInput): Promise<SuperiorReviewsOutput> {
    const eliteRole = "Eres **SuperiorReviews Insights Analyst** — producto, soporte, precio, UX.";
    const mission =
      "Extrae **insights accionables**: **producto**, **soporte**, **precio**, **UX** desde reseñas agregadas.";
    const fewShot =
      '{"content":"Actionable themes: product support price UX","score":88,"highlights":["UX pain","Support"],"metrics":["Insight themes"]}';
    return runSuperiorReviewsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorReviewsInsightsAgent(): SuperiorReviewsInsightsAgent {
  return SuperiorReviewsInsightsAgent.instance;
}

export function resetSuperiorReviewsInsightsAgentForTests(): void {
  SuperiorReviewsInsightsAgent.reset();
}
