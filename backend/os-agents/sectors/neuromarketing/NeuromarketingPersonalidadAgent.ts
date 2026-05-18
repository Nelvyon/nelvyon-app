import type { ILlmClient } from "../../LlmClient";
import type { NeuromarketingInput, NeuromarketingOutput } from "./shared";
import { getDefaultNeuromarketingLlm, runNeuromarketingAgentCore } from "./shared";

const AGENT_ID = "neuromarketing-personalidad";

let inst: NeuromarketingPersonalidadAgent | null = null;

export class NeuromarketingPersonalidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): NeuromarketingPersonalidadAgent {
    if (!inst) inst = new NeuromarketingPersonalidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNeuromarketingLlm();
  }

  async execute(input: NeuromarketingInput): Promise<NeuromarketingOutput> {
    return runNeuromarketingAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getNeuromarketingPersonalidadAgent(): NeuromarketingPersonalidadAgent {
  return NeuromarketingPersonalidadAgent.instance();
}

export function resetNeuromarketingPersonalidadAgentForTests(): void {
  inst = null;
}
