import type { ILlmClient } from "../../LlmClient";
import type { RestaurantesInput, RestaurantesOutput } from "./shared";
import { getDefaultRestaurantesLlm, runRestaurantesAgentCore } from "./shared";

const AGENT_ID = "restaurantes-restaurantepresencia";

export class RestaurantePresenciaAgent {
  private static inst: RestaurantePresenciaAgent | undefined;

  static get instance(): RestaurantePresenciaAgent {
    if (!RestaurantePresenciaAgent.inst) RestaurantePresenciaAgent.inst = new RestaurantePresenciaAgent();
    return RestaurantePresenciaAgent.inst;
  }

  static reset(): void {
    RestaurantePresenciaAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRestaurantesLlm();
  }

  async run(input: RestaurantesInput): Promise<RestaurantesOutput> {
    const eliteRole = "Eres **Restaurante Presencia** — presencia en directorios.";
    const mission =
      "Optimiza **Google My Business, TripAdvisor y TheFork** de forma automática para **top 3 Maps <90 días**.";
    const fewShot =
      '{"content":"Presencia: GMB, TripAdvisor, TheFork, top 3 Maps <90 d","score":94,"highlights":["Top 3 Maps","Auto optimización"],"metrics":["Maps ranking"]}';
    return runRestaurantesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRestaurantePresenciaAgent(): RestaurantePresenciaAgent {
  return RestaurantePresenciaAgent.instance;
}

export function resetRestaurantePresenciaAgentForTests(): void {
  RestaurantePresenciaAgent.reset();
}
