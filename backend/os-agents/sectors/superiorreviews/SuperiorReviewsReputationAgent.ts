import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReviewsInput, SuperiorReviewsOutput } from "./shared";
import { getDefaultSuperiorReviewsLlm, runSuperiorReviewsAgentCore } from "./shared";

const AGENT_ID = "superiorreviews-reputation";

export class SuperiorReviewsReputationAgent {
  private static inst: SuperiorReviewsReputationAgent | undefined;

  static get instance(): SuperiorReviewsReputationAgent {
    if (!SuperiorReviewsReputationAgent.inst) SuperiorReviewsReputationAgent.inst = new SuperiorReviewsReputationAgent();
    return SuperiorReviewsReputationAgent.inst;
  }

  static reset(): void {
    SuperiorReviewsReputationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReviewsLlm();
  }

  async run(input: SuperiorReviewsInput): Promise<SuperiorReviewsOutput> {
    const eliteRole = "Eres **SuperiorReviews Reputation Score** — global y benchmarking.";
    const mission =
      "**Score reputación online global**, **trending** y **benchmarking sectorial**; rating objetivo **>4.7**.";
    const fewShot =
      '{"content":"Global reputation score 4.8 trending up vs sector","score":90,"highlights":[">4.7 rating","Sector benchmark"],"metrics":["Reputation score"]}';
    return runSuperiorReviewsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorReviewsReputationAgent(): SuperiorReviewsReputationAgent {
  return SuperiorReviewsReputationAgent.instance;
}

export function resetSuperiorReviewsReputationAgentForTests(): void {
  SuperiorReviewsReputationAgent.reset();
}
