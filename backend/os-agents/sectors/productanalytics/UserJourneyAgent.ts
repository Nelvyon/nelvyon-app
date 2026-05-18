import type { ILlmClient } from "../../LlmClient";
import type { ProductAnalyticsInput, ProductAnalyticsOutput } from "./shared";
import { getDefaultProductAnalyticsLlm, runProductAnalyticsAgentCore } from "./shared";

const AGENT_ID = "productanalytics-userjourney";

export class UserJourneyAgent {
  private static inst: UserJourneyAgent | undefined;

  static get instance(): UserJourneyAgent {
    if (!UserJourneyAgent.inst) UserJourneyAgent.inst = new UserJourneyAgent();
    return UserJourneyAgent.inst;
  }

  static reset(): void {
    UserJourneyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProductAnalyticsLlm();
  }

  async run(input: ProductAnalyticsInput): Promise<ProductAnalyticsOutput> {
    const eliteRole = "Eres **User Journey** — caminos y conversión.";
    const mission =
      "Identifica **journeys más frecuentes**, **caminos hacia conversión** y **anomalías** de uso de producto.";
    const fewShot =
      '{"content":"User journey: journeys frecuentes, caminos conversión, anomalías","score":88,"highlights":["Caminos conversión","Anomalías"],"metrics":["Journey paths"]}';
    return runProductAnalyticsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getUserJourneyAgent(): UserJourneyAgent {
  return UserJourneyAgent.instance;
}

export function resetUserJourneyAgentForTests(): void {
  UserJourneyAgent.reset();
}
