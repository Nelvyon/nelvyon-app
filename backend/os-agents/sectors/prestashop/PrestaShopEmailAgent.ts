import type { ILlmClient } from "../../LlmClient";
import type { PrestaShopInput, PrestaShopOutput } from "./shared";
import { getDefaultPrestaShopLlm, runPrestaShopAgentCore } from "./shared";

const AGENT_ID = "prestashop-email";

export class PrestaShopEmailAgent {
  private static inst: PrestaShopEmailAgent | undefined;

  static get instance(): PrestaShopEmailAgent {
    if (!PrestaShopEmailAgent.inst) PrestaShopEmailAgent.inst = new PrestaShopEmailAgent();
    return PrestaShopEmailAgent.inst;
  }

  static reset(): void {
    PrestaShopEmailAgent.inst = undefined;
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
        eliteRole: "Eres **PrestaShop Lifecycle Email Strategist** — transaccional y campañas por comportamiento.",
        mission:
          "Genera **emails transaccionales** y **campañas por comportamiento** (carrito, post-compra, winback VIP); copy priorizado **ES/FR/IT**.",
        fewShotExample:
          '{"content":"Transactional + behavioral flows ES/FR/IT","score":90,"highlights":["Behavior triggers","Multilingual"],"metrics":["Open rate"]}',
      },
      input,
      0.7,
    );
  }
}

export function getPrestaShopEmailAgent(): PrestaShopEmailAgent {
  return PrestaShopEmailAgent.instance;
}

export function resetPrestaShopEmailAgentForTests(): void {
  PrestaShopEmailAgent.reset();
}
