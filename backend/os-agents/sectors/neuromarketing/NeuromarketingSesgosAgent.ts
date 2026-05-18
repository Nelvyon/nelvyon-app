import type { ILlmClient } from "../../LlmClient";
import type { NeuromarketingInput, NeuromarketingOutput } from "./shared";
import { getDefaultNeuromarketingLlm, runNeuromarketingAgentCore } from "./shared";

const AGENT_ID = "neuromarketing-sesgos";

let inst: NeuromarketingSesgosAgent | null = null;

export class NeuromarketingSesgosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): NeuromarketingSesgosAgent {
    if (!inst) inst = new NeuromarketingSesgosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNeuromarketingLlm();
  }

  async execute(input: NeuromarketingInput): Promise<NeuromarketingOutput> {
    return runNeuromarketingAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getNeuromarketingSesgosAgent(): NeuromarketingSesgosAgent {
  return NeuromarketingSesgosAgent.instance();
}

export function resetNeuromarketingSesgosAgentForTests(): void {
  inst = null;
}
