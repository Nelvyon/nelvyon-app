import type { ILlmClient } from "../../LlmClient";
import type { NeuromarketingInput, NeuromarketingOutput } from "./shared";
import { getDefaultNeuromarketingLlm, runNeuromarketingAgentCore } from "./shared";

const AGENT_ID = "neuromarketing-ux";

let inst: NeuromarketingUxAgent | null = null;

export class NeuromarketingUxAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): NeuromarketingUxAgent {
    if (!inst) inst = new NeuromarketingUxAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNeuromarketingLlm();
  }

  async execute(input: NeuromarketingInput): Promise<NeuromarketingOutput> {
    return runNeuromarketingAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getNeuromarketingUxAgent(): NeuromarketingUxAgent {
  return NeuromarketingUxAgent.instance();
}

export function resetNeuromarketingUxAgentForTests(): void {
  inst = null;
}
