import type { ILlmClient } from "../../LlmClient";
import type { PrestaShopInput, PrestaShopOutput } from "./shared";
import { getDefaultPrestaShopLlm, runPrestaShopAgentCore } from "./shared";

const AGENT_ID = "prestashop-order";

export class PrestaShopOrderAgent {
  private static inst: PrestaShopOrderAgent | undefined;

  static get instance(): PrestaShopOrderAgent {
    if (!PrestaShopOrderAgent.inst) PrestaShopOrderAgent.inst = new PrestaShopOrderAgent();
    return PrestaShopOrderAgent.inst;
  }

  static reset(): void {
    PrestaShopOrderAgent.inst = undefined;
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
        eliteRole: "Eres **PrestaShop Order Orchestrator** — pedidos y automatización post-compra multicanal.",
        mission:
          "Procesa **pedidos** y dispara **post-compra**: **confirmación**, **upsell producto relacionado** y **review D+7**; segmentación one_time / recurring / VIP.",
        fewShotExample:
          '{"content":"Order paid → confirm + related upsell + review D7","score":91,"highlights":["Confirmation","Upsell"],"metrics":["Post-purchase"]}',
      },
      input,
      0.2,
    );
  }
}

export function getPrestaShopOrderAgent(): PrestaShopOrderAgent {
  return PrestaShopOrderAgent.instance;
}

export function resetPrestaShopOrderAgentForTests(): void {
  PrestaShopOrderAgent.reset();
}
