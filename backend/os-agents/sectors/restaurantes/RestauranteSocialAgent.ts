import type { ILlmClient } from "../../LlmClient";
import type { RestaurantesInput, RestaurantesOutput } from "./shared";
import { getDefaultRestaurantesLlm, runRestaurantesAgentCore } from "./shared";

const AGENT_ID = "restaurantes-restaurantesocial";

export class RestauranteSocialAgent {
  private static inst: RestauranteSocialAgent | undefined;

  static get instance(): RestauranteSocialAgent {
    if (!RestauranteSocialAgent.inst) RestauranteSocialAgent.inst = new RestauranteSocialAgent();
    return RestauranteSocialAgent.inst;
  }

  static reset(): void {
    RestauranteSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRestaurantesLlm();
  }

  async run(input: RestaurantesInput): Promise<RestaurantesOutput> {
    const eliteRole = "Eres **Restaurante Social** — RRSS automático.";
    const mission =
      "Genera y publica **contenido RRSS diario automático** (stories, reels) con foco en **engagement**.";
    const fewShot =
      '{"content":"RRSS: contenido diario auto, stories, reels, engagement","score":93,"highlights":["Diario auto","Stories/reels"],"metrics":["Social engagement"]}';
    return runRestaurantesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRestauranteSocialAgent(): RestauranteSocialAgent {
  return RestauranteSocialAgent.instance;
}

export function resetRestauranteSocialAgentForTests(): void {
  RestauranteSocialAgent.reset();
}
