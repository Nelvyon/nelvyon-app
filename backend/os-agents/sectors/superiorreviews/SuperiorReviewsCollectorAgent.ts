import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReviewsInput, SuperiorReviewsOutput } from "./shared";
import { getDefaultSuperiorReviewsLlm, runSuperiorReviewsAgentCore } from "./shared";

const AGENT_ID = "superiorreviews-collector";

export class SuperiorReviewsCollectorAgent {
  private static inst: SuperiorReviewsCollectorAgent | undefined;

  static get instance(): SuperiorReviewsCollectorAgent {
    if (!SuperiorReviewsCollectorAgent.inst) SuperiorReviewsCollectorAgent.inst = new SuperiorReviewsCollectorAgent();
    return SuperiorReviewsCollectorAgent.inst;
  }

  static reset(): void {
    SuperiorReviewsCollectorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReviewsLlm();
  }

  async run(input: SuperiorReviewsInput): Promise<SuperiorReviewsOutput> {
    const eliteRole = "Eres **SuperiorReviews Collector** — solicitud post-compra con timing óptimo.";
    const mission =
      "Solicita **reseñas automáticamente** post-compra/servicio con **timing óptimo por canal**; collection rate **>35%**.";
    const fewShot =
      '{"content":"Post-purchase review ask, channel timing, >35% collection","score":89,"highlights":[">35% collection","Optimal timing"],"metrics":["Collection rate"]}';
    return runSuperiorReviewsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorReviewsCollectorAgent(): SuperiorReviewsCollectorAgent {
  return SuperiorReviewsCollectorAgent.instance;
}

export function resetSuperiorReviewsCollectorAgentForTests(): void {
  SuperiorReviewsCollectorAgent.reset();
}
