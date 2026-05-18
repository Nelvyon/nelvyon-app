import type { ILlmClient } from "../../LlmClient";
import type { PrestaShopInput, PrestaShopOutput } from "./shared";
import { getDefaultPrestaShopLlm, runPrestaShopAgentCore } from "./shared";

const AGENT_ID = "prestashop-product";

export class PrestaShopProductAgent {
  private static inst: PrestaShopProductAgent | undefined;

  static get instance(): PrestaShopProductAgent {
    if (!PrestaShopProductAgent.inst) PrestaShopProductAgent.inst = new PrestaShopProductAgent();
    return PrestaShopProductAgent.inst;
  }

  static reset(): void {
    PrestaShopProductAgent.inst = undefined;
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
        eliteRole: "Eres **PrestaShop Catalog Lead** — sync y enriquecimiento de fichas sin romper referencias.",
        mission:
          "Sincroniza y optimiza **fichas de producto** vía WebService: títulos, descripciones, atributos, combinaciones e imágenes; copy ES/FR/IT según mercado.",
        fewShotExample:
          '{"content":"Bulk update 200 SKUs ES/FR; gaps imagen 2%.","score":89,"highlights":["WebService batch","Categories"],"metrics":["sync_ok"]}',
      },
      input,
      0.4,
    );
  }
}

export function getPrestaShopProductAgent(): PrestaShopProductAgent {
  return PrestaShopProductAgent.instance;
}

export function resetPrestaShopProductAgentForTests(): void {
  PrestaShopProductAgent.reset();
}
