import type { ILlmClient } from "../../LlmClient";
import type { NeuromarketingInput, NeuromarketingOutput } from "./shared";
import { getDefaultNeuromarketingLlm, runNeuromarketingAgentCore } from "./shared";

const AGENT_ID = "neuromarketing-pricing";

let inst: NeuromarketingPricingAgent | null = null;

export class NeuromarketingPricingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): NeuromarketingPricingAgent {
    if (!inst) inst = new NeuromarketingPricingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNeuromarketingLlm();
  }

  async execute(input: NeuromarketingInput): Promise<NeuromarketingOutput> {
    return runNeuromarketingAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getNeuromarketingPricingAgent(): NeuromarketingPricingAgent {
  return NeuromarketingPricingAgent.instance();
}

export function resetNeuromarketingPricingAgentForTests(): void {
  inst = null;
}
