import type { ILlmClient } from "../../LlmClient";
import type { PrestaShopInput, PrestaShopOutput } from "./shared";
import { getDefaultPrestaShopLlm, runPrestaShopAgentCore } from "./shared";

const AGENT_ID = "prestashop-abandoned-cart";

export class PrestaShopAbandonedCartAgent {
  private static inst: PrestaShopAbandonedCartAgent | undefined;

  static get instance(): PrestaShopAbandonedCartAgent {
    if (!PrestaShopAbandonedCartAgent.inst) PrestaShopAbandonedCartAgent.inst = new PrestaShopAbandonedCartAgent();
    return PrestaShopAbandonedCartAgent.inst;
  }

  static reset(): void {
    PrestaShopAbandonedCartAgent.inst = undefined;
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
        eliteRole: "Eres **PrestaShop Recovery Specialist** — carritos abandonados y urgencia comercial ética.",
        mission:
          "Detecta **carritos abandonados** y lanza secuencia **3 emails (1h, 24h, 72h)** con descuento progresivo **5% / 10% / 15%**; copy ES/FR/IT.",
        fewShotExample:
          '{"content":"Cart 1h 5% → 24h 10% → 72h 15%","score":92,"highlights":["1h/24h/72h","Progressive discount"],"metrics":["Recovery rate"]}',
      },
      input,
      0.2,
    );
  }
}

export function getPrestaShopAbandonedCartAgent(): PrestaShopAbandonedCartAgent {
  return PrestaShopAbandonedCartAgent.instance;
}

export function resetPrestaShopAbandonedCartAgentForTests(): void {
  PrestaShopAbandonedCartAgent.reset();
}
