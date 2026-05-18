import type { ILlmClient } from "../../LlmClient";
import type { RestaurantesInput, RestaurantesOutput } from "./shared";
import { getDefaultRestaurantesLlm, runRestaurantesAgentCore } from "./shared";

const AGENT_ID = "restaurantes-restauranteanalytics";

export class RestauranteAnalyticsAgent {
  private static inst: RestauranteAnalyticsAgent | undefined;

  static get instance(): RestauranteAnalyticsAgent {
    if (!RestauranteAnalyticsAgent.inst) RestauranteAnalyticsAgent.inst = new RestauranteAnalyticsAgent();
    return RestauranteAnalyticsAgent.inst;
  }

  static reset(): void {
    RestauranteAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRestaurantesLlm();
  }

  async run(input: RestaurantesInput): Promise<RestaurantesOutput> {
    const eliteRole = "Eres **Restaurante Analytics** — operaciones y LTV.";
    const mission =
      "Analiza **ticket medio, ocupación, días/horas pico** y **LTV cliente** para decisiones operativas.";
    const fewShot =
      '{"content":"Analytics: ticket medio, ocupación, picos, LTV","score":92,"highlights":["Horas pico","LTV"],"metrics":["Ticket medio"]}';
    return runRestaurantesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRestauranteAnalyticsAgent(): RestauranteAnalyticsAgent {
  return RestauranteAnalyticsAgent.instance;
}

export function resetRestauranteAnalyticsAgentForTests(): void {
  RestauranteAnalyticsAgent.reset();
}
