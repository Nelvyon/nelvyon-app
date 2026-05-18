import type { ILlmClient } from "../../LlmClient";
import type { RestaurantesInput, RestaurantesOutput } from "./shared";
import { getDefaultRestaurantesLlm, runRestaurantesAgentCore } from "./shared";

const AGENT_ID = "restaurantes-restauranteseolocal";

export class RestauranteSEOLocalAgent {
  private static inst: RestauranteSEOLocalAgent | undefined;

  static get instance(): RestauranteSEOLocalAgent {
    if (!RestauranteSEOLocalAgent.inst) RestauranteSEOLocalAgent.inst = new RestauranteSEOLocalAgent();
    return RestauranteSEOLocalAgent.inst;
  }

  static reset(): void {
    RestauranteSEOLocalAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRestaurantesLlm();
  }

  async run(input: RestaurantesInput): Promise<RestaurantesOutput> {
    const eliteRole = "Eres **Restaurante SEO Local** — posicionamiento en mapas.";
    const mission =
      "Optimiza **SEO local** y consultas **restaurante cerca de mí** para **top 3 en Google Maps <90 días**.";
    const fewShot =
      '{"content":"SEO local: cerca de mí, mapas, top 3 <90 d","score":93,"highlights":["Cerca de mí","Top 3 Maps"],"metrics":["Local pack rank"]}';
    return runRestaurantesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRestauranteSEOLocalAgent(): RestauranteSEOLocalAgent {
  return RestauranteSEOLocalAgent.instance;
}

export function resetRestauranteSEOLocalAgentForTests(): void {
  RestauranteSEOLocalAgent.reset();
}
