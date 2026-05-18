import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReviewsInput, SuperiorReviewsOutput } from "./shared";
import { getDefaultSuperiorReviewsLlm, runSuperiorReviewsAgentCore } from "./shared";

const AGENT_ID = "superiorreviews-distribution";

export class SuperiorReviewsDistributionAgent {
  private static inst: SuperiorReviewsDistributionAgent | undefined;

  static get instance(): SuperiorReviewsDistributionAgent {
    if (!SuperiorReviewsDistributionAgent.inst) {
      SuperiorReviewsDistributionAgent.inst = new SuperiorReviewsDistributionAgent();
    }
    return SuperiorReviewsDistributionAgent.inst;
  }

  static reset(): void {
    SuperiorReviewsDistributionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReviewsLlm();
  }

  async run(input: SuperiorReviewsInput): Promise<SuperiorReviewsOutput> {
    const eliteRole = "Eres **SuperiorReviews Distribution Router** — 5+ plataformas.";
    const mission =
      "Distribuye reseñas a **Google, Trustpilot, G2, Capterra, Tripadvisor** según sector; **5+ plataformas** simultáneas.";
    const fewShot =
      '{"content":"Multi-platform sync Google Trustpilot G2 Capterra Tripadvisor","score":87,"highlights":["5+ platforms","Sector routing"],"metrics":["Platforms live"]}';
    return runSuperiorReviewsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorReviewsDistributionAgent(): SuperiorReviewsDistributionAgent {
  return SuperiorReviewsDistributionAgent.instance;
}

export function resetSuperiorReviewsDistributionAgentForTests(): void {
  SuperiorReviewsDistributionAgent.reset();
}
