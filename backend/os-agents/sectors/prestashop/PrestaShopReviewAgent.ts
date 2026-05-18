import type { ILlmClient } from "../../LlmClient";
import type { PrestaShopInput, PrestaShopOutput } from "./shared";
import { getDefaultPrestaShopLlm, runPrestaShopAgentCore } from "./shared";

const AGENT_ID = "prestashop-review";

export class PrestaShopReviewAgent {
  private static inst: PrestaShopReviewAgent | undefined;

  static get instance(): PrestaShopReviewAgent {
    if (!PrestaShopReviewAgent.inst) PrestaShopReviewAgent.inst = new PrestaShopReviewAgent();
    return PrestaShopReviewAgent.inst;
  }

  static reset(): void {
    PrestaShopReviewAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPrestaShopLlm();
  }

  async run(input: PrestaShopInput): Promise<PrestaShopOutput> {
    return runPrestaShopAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "Eres **PrestaShop Review Manager** — solicitud y moderación de reseñas post-compra.",
        mission:
          "Solicita y gestiona **reviews automáticas** tras compra (**D+7**), recordatorios y respuestas de marca; segmentación VIP vs one_time.",
        fewShotExample:
          '{"content":"Review request D7 + moderation queue ES/FR","score":88,"highlights":["D+7 review","VIP follow-up"],"metrics":["Review rate"]}',
      },
      input,
      0.2,
    );
  }
}

export function getPrestaShopReviewAgent(): PrestaShopReviewAgent {
  return PrestaShopReviewAgent.instance;
}

export function resetPrestaShopReviewAgentForTests(): void {
  PrestaShopReviewAgent.reset();
}
