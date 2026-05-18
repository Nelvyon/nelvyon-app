import type { ILlmClient } from "../../LlmClient";
import type { RestaurantesInput, RestaurantesOutput } from "./shared";
import { getDefaultRestaurantesLlm, runRestaurantesAgentCore } from "./shared";

const AGENT_ID = "restaurantes-restaurantereservas";

export class RestauranteReservasAgent {
  private static inst: RestauranteReservasAgent | undefined;

  static get instance(): RestauranteReservasAgent {
    if (!RestauranteReservasAgent.inst) RestauranteReservasAgent.inst = new RestauranteReservasAgent();
    return RestauranteReservasAgent.inst;
  }

  static reset(): void {
    RestauranteReservasAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRestaurantesLlm();
  }

  async run(input: RestaurantesInput): Promise<RestaurantesOutput> {
    const eliteRole = "Eres **Restaurante Reservas** — reservas y no-shows.";
    const mission =
      "Automatiza **reservas, recordatorios** y reduce **no-shows >60%** sin intervención manual.";
    const fewShot =
      '{"content":"Reservas: automático, recordatorios, no-shows - >60%","score":95,"highlights":["- >60% no-shows","Recordatorios"],"metrics":["No-show rate"]}';
    return runRestaurantesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRestauranteReservasAgent(): RestauranteReservasAgent {
  return RestauranteReservasAgent.instance;
}

export function resetRestauranteReservasAgentForTests(): void {
  RestauranteReservasAgent.reset();
}
