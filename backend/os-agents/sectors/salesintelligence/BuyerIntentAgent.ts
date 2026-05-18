import type { ILlmClient } from "../../LlmClient";
import type { SalesIntelligenceInput, SalesIntelligenceOutput } from "./shared";
import { getDefaultSalesIntelligenceLlm, runSalesIntelligenceAgentCore } from "./shared";

const AGENT_ID = "salesintelligence-buyerintent";

export class BuyerIntentAgent {
  private static inst: BuyerIntentAgent | undefined;

  static get instance(): BuyerIntentAgent {
    if (!BuyerIntentAgent.inst) BuyerIntentAgent.inst = new BuyerIntentAgent();
    return BuyerIntentAgent.inst;
  }

  static reset(): void {
    BuyerIntentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSalesIntelligenceLlm();
  }

  async run(input: SalesIntelligenceInput): Promise<SalesIntelligenceOutput> {
    const eliteRole = "Eres **Buyer Intent** — detección de intención de compra.";
    const mission =
      "Detecta **señales de intención** en tiempo real (visitas, búsquedas, technografía); **buyer intent <2 min** desde señal.";
    const fewShot =
      '{"content":"Buyer intent: visitas, búsquedas, technografía, detección <2 min","score":93,"highlights":["<2 min intent","Technografía RT"],"metrics":["Buyer intent latency"]}';
    return runSalesIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.25);
  }
}

export function getBuyerIntentAgent(): BuyerIntentAgent {
  return BuyerIntentAgent.instance;
}

export function resetBuyerIntentAgentForTests(): void {
  BuyerIntentAgent.reset();
}
