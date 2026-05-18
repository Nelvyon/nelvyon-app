import type { ILlmClient } from "../../LlmClient";
import type { PwaInput, PwaOutput } from "./shared";
import { getDefaultPwaLlm, runPwaAgentCore } from "./shared";

const AGENT_ID = "pwa-offline";

let inst: PwaOfflineAgent | null = null;

export class PwaOfflineAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PwaOfflineAgent {
    if (!inst) inst = new PwaOfflineAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPwaLlm();
  }

  async execute(input: PwaInput): Promise<PwaOutput> {
    return runPwaAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getPwaOfflineAgent(): PwaOfflineAgent {
  return PwaOfflineAgent.instance();
}

export function resetPwaOfflineAgentForTests(): void {
  inst = null;
}
