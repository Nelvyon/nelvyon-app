import type { ILlmClient } from "../../LlmClient";
import type { RestaurantesInput, RestaurantesOutput } from "./shared";
import { getDefaultRestaurantesLlm, runRestaurantesAgentCore } from "./shared";

const AGENT_ID = "restaurantes-restauranteemailsms";

export class RestauranteEmailSMSAgent {
  private static inst: RestauranteEmailSMSAgent | undefined;

  static get instance(): RestauranteEmailSMSAgent {
    if (!RestauranteEmailSMSAgent.inst) RestauranteEmailSMSAgent.inst = new RestauranteEmailSMSAgent();
    return RestauranteEmailSMSAgent.inst;
  }

  static reset(): void {
    RestauranteEmailSMSAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRestaurantesLlm();
  }

  async run(input: RestaurantesInput): Promise<RestaurantesOutput> {
    const eliteRole = "Eres **Restaurante Email/SMS** — fidelización.";
    const mission =
      "Lanza **campañas de fidelización**, **cumpleaños** y **ofertas segmentadas** por email y SMS.";
    const fewShot =
      '{"content":"Email/SMS: fidelización, cumpleaños, ofertas segmentadas","score":92,"highlights":["Cumpleaños auto","Segmentación"],"metrics":["Repeat visit rate"]}';
    return runRestaurantesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getRestauranteEmailSMSAgent(): RestauranteEmailSMSAgent {
  return RestauranteEmailSMSAgent.instance;
}

export function resetRestauranteEmailSMSAgentForTests(): void {
  RestauranteEmailSMSAgent.reset();
}
