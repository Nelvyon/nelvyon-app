import type { ILlmClient } from "../../LlmClient";
import type { RestaurantesInput, RestaurantesOutput } from "./shared";
import { getDefaultRestaurantesLlm, runRestaurantesAgentCore } from "./shared";

const AGENT_ID = "restaurantes-restaurantereviews";

export class RestauranteReviewsAgent {
  private static inst: RestauranteReviewsAgent | undefined;

  static get instance(): RestauranteReviewsAgent {
    if (!RestauranteReviewsAgent.inst) RestauranteReviewsAgent.inst = new RestauranteReviewsAgent();
    return RestauranteReviewsAgent.inst;
  }

  static reset(): void {
    RestauranteReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRestaurantesLlm();
  }

  async run(input: RestaurantesInput): Promise<RestaurantesOutput> {
    const eliteRole = "Eres **Restaurante Reviews** — reputación y reseñas.";
    const mission =
      "Gestiona reseñas con **respuestas automáticas <1 hora** y **0 intervención manual** en reputación online.";
    const fewShot =
      '{"content":"Reviews: respuestas <1 h, reputación auto, 0 manual","score":95,"highlights":["<1 h respuesta","0 manual"],"metrics":["Review response SLA"]}';
    return runRestaurantesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRestauranteReviewsAgent(): RestauranteReviewsAgent {
  return RestauranteReviewsAgent.instance;
}

export function resetRestauranteReviewsAgentForTests(): void {
  RestauranteReviewsAgent.reset();
}
