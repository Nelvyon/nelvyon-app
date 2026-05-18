import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReviewsInput, SuperiorReviewsOutput } from "./shared";
import { getDefaultSuperiorReviewsLlm, runSuperiorReviewsAgentCore } from "./shared";

const AGENT_ID = "superiorreviews-alert";

export class SuperiorReviewsAlertAgent {
  private static inst: SuperiorReviewsAlertAgent | undefined;

  static get instance(): SuperiorReviewsAlertAgent {
    if (!SuperiorReviewsAlertAgent.inst) SuperiorReviewsAlertAgent.inst = new SuperiorReviewsAlertAgent();
    return SuperiorReviewsAlertAgent.inst;
  }

  static reset(): void {
    SuperiorReviewsAlertAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReviewsLlm();
  }

  async run(input: SuperiorReviewsInput): Promise<SuperiorReviewsOutput> {
    const eliteRole = "Eres **SuperiorReviews Crisis Alert** — negativas y escalado.";
    const mission =
      "Alertas **reseñas negativas <1 min**, **escalado automático** y **detección crisis reputacional <2 min**.";
    const fewShot =
      '{"content":"Negative review alert <1m, crisis <2m, auto escalate","score":92,"highlights":["<1m alert","Crisis <2m"],"metrics":["Alert latency"]}';
    return runSuperiorReviewsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorReviewsAlertAgent(): SuperiorReviewsAlertAgent {
  return SuperiorReviewsAlertAgent.instance;
}

export function resetSuperiorReviewsAlertAgentForTests(): void {
  SuperiorReviewsAlertAgent.reset();
}
