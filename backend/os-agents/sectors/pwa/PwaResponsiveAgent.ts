import type { ILlmClient } from "../../LlmClient";
import type { PwaInput, PwaOutput } from "./shared";
import { getDefaultPwaLlm, runPwaAgentCore } from "./shared";

const AGENT_ID = "pwa-responsive";

let inst: PwaResponsiveAgent | null = null;

export class PwaResponsiveAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PwaResponsiveAgent {
    if (!inst) inst = new PwaResponsiveAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPwaLlm();
  }

  async execute(input: PwaInput): Promise<PwaOutput> {
    return runPwaAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getPwaResponsiveAgent(): PwaResponsiveAgent {
  return PwaResponsiveAgent.instance();
}

export function resetPwaResponsiveAgentForTests(): void {
  inst = null;
}
