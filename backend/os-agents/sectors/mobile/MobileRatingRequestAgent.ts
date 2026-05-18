import type { ILlmClient } from "../../LlmClient";
import type { MobileInput, MobileOutput } from "./shared";
import { getDefaultMobileLlm, runMobileAgentCore } from "./shared";

const AGENT_ID = "mobile-rating-request";

export class MobileRatingRequestAgent {
  private static inst: MobileRatingRequestAgent | undefined;

  static get instance(): MobileRatingRequestAgent {
    if (!MobileRatingRequestAgent.inst) MobileRatingRequestAgent.inst = new MobileRatingRequestAgent();
    return MobileRatingRequestAgent.inst;
  }

  static reset(): void {
    MobileRatingRequestAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMobileLlm();
  }

  async run(input: MobileInput): Promise<MobileOutput> {
    return runMobileAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: App Store ratings optimizer top 1%; timing y copy que maximizan 5★ sin manipular.",
        mission:
          "Diseña flujo óptimo de solicitud de valoración: momentos, copy, fallback y reglas iOS/Android.",
        fewShotExample:
          "Input: productivity. Output JSON: screens post-success survey gate; features SKStoreReview limits.",
      },
      input,
      0.5,
    );
  }
}

export function getMobileRatingRequestAgent(): MobileRatingRequestAgent {
  return MobileRatingRequestAgent.instance;
}

export function resetMobileRatingRequestAgentForTests(): void {
  MobileRatingRequestAgent.reset();
}
