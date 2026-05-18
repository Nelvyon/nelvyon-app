import type { ILlmClient } from "../../LlmClient";
import type { EcommerceInput, EcommerceOutput } from "./shared";
import { getDefaultEcommerceLlm, runEcommerceAgentCore } from "./shared";

const AGENT_ID = "ecommerce-cartabandonment";

export class CartAbandonmentAgent {
  private static inst: CartAbandonmentAgent | undefined;

  static get instance(): CartAbandonmentAgent {
    if (!CartAbandonmentAgent.inst) CartAbandonmentAgent.inst = new CartAbandonmentAgent();
    return CartAbandonmentAgent.inst;
  }

  static reset(): void {
    CartAbandonmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceLlm();
  }

  async run(input: EcommerceInput): Promise<EcommerceOutput> {
    const eliteRole = "Eres **Cart Abandonment** — recuperación de carritos.";
    const mission =
      "Recupera carritos abandonados con **secuencias email+SMS+retargeting** y tasa **>35%** (industria 15%).";
    const fewShot =
      '{"content":"Carrito: email+SMS+retargeting, >35% recovery","score":95,"highlights":[">35% recovery","Omnicanal"],"metrics":["Cart recovery rate"]}';
    return runEcommerceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getCartAbandonmentAgent(): CartAbandonmentAgent {
  return CartAbandonmentAgent.instance;
}

export function resetCartAbandonmentAgentForTests(): void {
  CartAbandonmentAgent.reset();
}
