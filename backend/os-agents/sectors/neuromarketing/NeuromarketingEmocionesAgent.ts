import type { ILlmClient } from "../../LlmClient";
import type { NeuromarketingInput, NeuromarketingOutput } from "./shared";
import { getDefaultNeuromarketingLlm, runNeuromarketingAgentCore } from "./shared";

const AGENT_ID = "neuromarketing-emociones";

let inst: NeuromarketingEmocionesAgent | null = null;

export class NeuromarketingEmocionesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): NeuromarketingEmocionesAgent {
    if (!inst) inst = new NeuromarketingEmocionesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultNeuromarketingLlm();
  }

  async execute(input: NeuromarketingInput): Promise<NeuromarketingOutput> {
    return runNeuromarketingAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getNeuromarketingEmocionesAgent(): NeuromarketingEmocionesAgent {
  return NeuromarketingEmocionesAgent.instance();
}

export function resetNeuromarketingEmocionesAgentForTests(): void {
  inst = null;
}
