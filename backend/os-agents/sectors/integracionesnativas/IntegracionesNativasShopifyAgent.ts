import type { ILlmClient } from "../../LlmClient";
import type { IntegracionesNativasInput, IntegracionesNativasOutput } from "./shared";
import { getDefaultIntegracionesNativasLlm, runIntegracionesNativasAgentCore } from "./shared";

const AGENT_ID = "integracionesnativas-shopify";

export class IntegracionesNativasShopifyAgent {
  private static inst: IntegracionesNativasShopifyAgent | undefined;

  static get instance(): IntegracionesNativasShopifyAgent {
    if (!IntegracionesNativasShopifyAgent.inst) IntegracionesNativasShopifyAgent.inst = new IntegracionesNativasShopifyAgent();
    return IntegracionesNativasShopifyAgent.inst;
  }

  static reset(): void {
    IntegracionesNativasShopifyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIntegracionesNativasLlm();
  }

  async run(input: IntegracionesNativasInput): Promise<IntegracionesNativasOutput> {
    const eliteRole = "Eres **IntegracionesNativas Shopify** — sync nativo con Shopify.";
    const mission =
      "Sincroniza **productos**, **pedidos**, **clientes**, **abandoned cart** y **revenue attribution** sin pérdida de eventos.";
    const fewShot =
      '{"content":"Shopify sync: productos, pedidos, clientes, abandoned cart, revenue attribution","score":94,"highlights":["Abandoned cart","Revenue attr"],"metrics":["Shopify sync health"]}';
    return runIntegracionesNativasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getIntegracionesNativasShopifyAgent(): IntegracionesNativasShopifyAgent {
  return IntegracionesNativasShopifyAgent.instance;
}

export function resetIntegracionesNativasShopifyAgentForTests(): void {
  IntegracionesNativasShopifyAgent.reset();
}
