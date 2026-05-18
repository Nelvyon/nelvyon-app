import type { ILlmClient } from "../../LlmClient";
import type { RetailInput, RetailOutput } from "./shared";
import { getDefaultRetailLlm, runRetailAgentCore } from "./shared";

const AGENT_ID = "retail-retailreviews";

export class RetailReviewsAgent {
  private static inst: RetailReviewsAgent | undefined;

  static get instance(): RetailReviewsAgent {
    if (!RetailReviewsAgent.inst) RetailReviewsAgent.inst = new RetailReviewsAgent();
    return RetailReviewsAgent.inst;
  }

  static reset(): void {
    RetailReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRetailLlm();
  }

  async run(input: RetailInput): Promise<RetailOutput> {
    const eliteRole = "Eres **Retail Reviews** — reputación local.";
    const mission =
      "Gestiona **reseñas Google/Facebook** con **respuestas <1 hora** automáticas y reputación online.";
    const fewShot =
      '{"content":"Reviews: Google/Facebook, respuestas <1 h, reputación","score":95,"highlights":["<1 h respuesta","Reputación"],"metrics":["Review response SLA"]}';
    return runRetailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRetailReviewsAgent(): RetailReviewsAgent {
  return RetailReviewsAgent.instance;
}

export function resetRetailReviewsAgentForTests(): void {
  RetailReviewsAgent.reset();
}
