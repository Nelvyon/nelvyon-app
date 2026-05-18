import type { ILlmClient } from "../../LlmClient";
import type { NeuromarketingInput, NeuromarketingOutput } from "./shared";
import { getDefaultNeuromarketingLlm, runNeuromarketingAgentCore } from "./shared";

const AGENT_ID = "neuromarketing-testing";

let inst: NeuromarketingTestingAgent | null = null;

export class NeuromarketingTestingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): NeuromarketingTestingAgent {
    if (!inst) inst = new NeuromarketingTestingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNeuromarketingLlm();
  }

  async execute(input: NeuromarketingInput): Promise<NeuromarketingOutput> {
    return runNeuromarketingAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getNeuromarketingTestingAgent(): NeuromarketingTestingAgent {
  return NeuromarketingTestingAgent.instance();
}

export function resetNeuromarketingTestingAgentForTests(): void {
  inst = null;
}
