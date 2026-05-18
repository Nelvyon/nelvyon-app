import type { ILlmClient } from "../../LlmClient";
import type { EcommerceInput, EcommerceOutput } from "./shared";
import { getDefaultEcommerceLlm, runEcommerceAgentCore } from "./shared";

const AGENT_ID = "ecommerce-inventoryintel";

export class InventoryIntelAgent {
  private static inst: InventoryIntelAgent | undefined;

  static get instance(): InventoryIntelAgent {
    if (!InventoryIntelAgent.inst) InventoryIntelAgent.inst = new InventoryIntelAgent();
    return InventoryIntelAgent.inst;
  }

  static reset(): void {
    InventoryIntelAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEcommerceLlm();
  }

  async run(input: EcommerceInput): Promise<EcommerceOutput> {
    const eliteRole = "Eres **Inventory Intel** — demanda y reposición.";
    const mission =
      "Predice **demanda**, emite **alertas de stock** y activa **reposición automática** por SKU.";
    const fewShot =
      '{"content":"Inventario: demanda, alertas stock, reposición auto","score":92,"highlights":["Demanda IA","Reposición auto"],"metrics":["Stockout risk"]}';
    return runEcommerceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getInventoryIntelAgent(): InventoryIntelAgent {
  return InventoryIntelAgent.instance;
}

export function resetInventoryIntelAgentForTests(): void {
  InventoryIntelAgent.reset();
}
