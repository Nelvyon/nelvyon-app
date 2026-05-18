import type { ILlmClient } from "../../LlmClient";
import type { PwaInput, PwaOutput } from "./shared";
import { getDefaultPwaLlm, runPwaAgentCore } from "./shared";

const AGENT_ID = "pwa-serviceWorker";

let inst: PwaServiceWorkerAgent | null = null;

export class PwaServiceWorkerAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PwaServiceWorkerAgent {
    if (!inst) inst = new PwaServiceWorkerAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPwaLlm();
  }

  async execute(input: PwaInput): Promise<PwaOutput> {
    return runPwaAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getPwaServiceWorkerAgent(): PwaServiceWorkerAgent {
  return PwaServiceWorkerAgent.instance();
}

export function resetPwaServiceWorkerAgentForTests(): void {
  inst = null;
}
