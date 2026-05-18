import type { ILlmClient } from "../../LlmClient";
import type { ReviewsInput, ReviewsOutput } from "./shared";
import { getDefaultReviewsLlm, runReviewsAgentCore } from "./shared";

const AGENT_ID = "reviews-escalation-handler";

export class ReviewsEscalationHandlerAgent {
  private static inst: ReviewsEscalationHandlerAgent | undefined;

  static get instance(): ReviewsEscalationHandlerAgent {
    if (!ReviewsEscalationHandlerAgent.inst) ReviewsEscalationHandlerAgent.inst = new ReviewsEscalationHandlerAgent();
    return ReviewsEscalationHandlerAgent.inst;
  }

  static reset(): void {
    ReviewsEscalationHandlerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultReviewsLlm();
  }

  async run(input: ReviewsInput): Promise<ReviewsOutput> {
    return runReviewsAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Crisis comms y reputación digital top 1%; defines protocolo escalonado sin fanar el conflicto online.",
        mission:
          "Gestiona reseña negativa crítica: primera respuesta pública, canal privado, stakeholders y línea temporal.",
        fewShotExample: `Input: acusación grave en Google Maps con viralidad potencial.
Output JSON: respuesta holding; sentiment negative; score 40; acciones legal review + llamada directiva.`,
      },
      input,
    );
  }
}

export function getReviewsEscalationHandlerAgent(): ReviewsEscalationHandlerAgent {
  return ReviewsEscalationHandlerAgent.instance;
}

export function resetReviewsEscalationHandlerAgentForTests(): void {
  ReviewsEscalationHandlerAgent.reset();
}
