import type { ILlmClient } from "../../LlmClient";
import type { RestaurantesInput, RestaurantesOutput } from "./shared";
import { getDefaultRestaurantesLlm, runRestaurantesAgentCore } from "./shared";

const AGENT_ID = "restaurantes-restaurantemenu";

export class RestauranteMenuAgent {
  private static inst: RestauranteMenuAgent | undefined;

  static get instance(): RestauranteMenuAgent {
    if (!RestauranteMenuAgent.inst) RestauranteMenuAgent.inst = new RestauranteMenuAgent();
    return RestauranteMenuAgent.inst;
  }

  static reset(): void {
    RestauranteMenuAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRestaurantesLlm();
  }

  async run(input: RestaurantesInput): Promise<RestaurantesOutput> {
    const eliteRole = "Eres **Restaurante Menú** — menú digital persuasivo.";
    const mission =
      "Optimiza **menú digital** con **fotografía IA** y **descripciones persuasivas** para **ticket medio +>20%**.";
    const fewShot =
      '{"content":"Menú: digital, fotos IA, copy persuasivo, +>20% ticket","score":94,"highlights":["+>20% ticket","Fotos IA"],"metrics":["Ticket medio"]}';
    return runRestaurantesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRestauranteMenuAgent(): RestauranteMenuAgent {
  return RestauranteMenuAgent.instance;
}

export function resetRestauranteMenuAgentForTests(): void {
  RestauranteMenuAgent.reset();
}
