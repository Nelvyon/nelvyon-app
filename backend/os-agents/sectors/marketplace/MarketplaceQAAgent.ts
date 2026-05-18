import type { ILlmClient } from "../../LlmClient";
import type { MarketplaceInput, MarketplaceOutput } from "./shared";
import { getDefaultMarketplaceLlm, runMarketplaceAgentCore } from "./shared";

const AGENT_ID = "marketplace-qa";

export class MarketplaceQAAgent {
  private static inst: MarketplaceQAAgent | undefined;

  static get instance(): MarketplaceQAAgent {
    if (!MarketplaceQAAgent.inst) MarketplaceQAAgent.inst = new MarketplaceQAAgent();
    return MarketplaceQAAgent.inst;
  }

  static reset(): void {
    MarketplaceQAAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMarketplaceLlm();
  }

  async run(input: MarketplaceInput): Promise<MarketplaceOutput> {
    return runMarketplaceAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Pre-publish gate; bloquea listing si QA falla.",
        mission:
          "Valida calidad y seguridad antes de aprobar: **prompt injection**, **calidad de salida**, **latencia < 3s** (benchmark orientativo); checklist pass/fail.",
        fewShotExample:
          '{"content":"QA PASS: sin jailbreak obvio, latencia OK simulada.","score":91,"highlights":["Injection scan","p95<3s"],"metrics":["APPROVED"]}',
      },
      input,
      0.1,
    );
  }
}

export function getMarketplaceQAAgent(): MarketplaceQAAgent {
  return MarketplaceQAAgent.instance;
}

export function resetMarketplaceQAAgentForTests(): void {
  MarketplaceQAAgent.reset();
}
