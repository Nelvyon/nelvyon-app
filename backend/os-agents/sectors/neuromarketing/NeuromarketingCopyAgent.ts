import type { ILlmClient } from "../../LlmClient";
import type { NeuromarketingInput, NeuromarketingOutput } from "./shared";
import { getDefaultNeuromarketingLlm, runNeuromarketingAgentCore } from "./shared";

const AGENT_ID = "neuromarketing-copy";

let inst: NeuromarketingCopyAgent | null = null;

export class NeuromarketingCopyAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): NeuromarketingCopyAgent {
    if (!inst) inst = new NeuromarketingCopyAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNeuromarketingLlm();
  }

  async execute(input: NeuromarketingInput): Promise<NeuromarketingOutput> {
    return runNeuromarketingAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getNeuromarketingCopyAgent(): NeuromarketingCopyAgent {
  return NeuromarketingCopyAgent.instance();
}

export function resetNeuromarketingCopyAgentForTests(): void {
  inst = null;
}
