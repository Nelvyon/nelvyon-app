import type { ILlmClient } from "../../LlmClient";
import type { NeuromarketingInput, NeuromarketingOutput } from "./shared";
import { getDefaultNeuromarketingLlm, runNeuromarketingAgentCore } from "./shared";

const AGENT_ID = "neuromarketing-conversion";

let inst: NeuromarketingConversionAgent | null = null;

export class NeuromarketingConversionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): NeuromarketingConversionAgent {
    if (!inst) inst = new NeuromarketingConversionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNeuromarketingLlm();
  }

  async execute(input: NeuromarketingInput): Promise<NeuromarketingOutput> {
    return runNeuromarketingAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getNeuromarketingConversionAgent(): NeuromarketingConversionAgent {
  return NeuromarketingConversionAgent.instance();
}

export function resetNeuromarketingConversionAgentForTests(): void {
  inst = null;
}
