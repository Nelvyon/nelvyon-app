import type { ILlmClient } from "../../LlmClient";
import type { PwaInput, PwaOutput } from "./shared";
import { getDefaultPwaLlm, runPwaAgentCore } from "./shared";

const AGENT_ID = "pwa-performance";

let inst: PwaPerformanceAgent | null = null;

export class PwaPerformanceAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PwaPerformanceAgent {
    if (!inst) inst = new PwaPerformanceAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPwaLlm();
  }

  async execute(input: PwaInput): Promise<PwaOutput> {
    return runPwaAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getPwaPerformanceAgent(): PwaPerformanceAgent {
  return PwaPerformanceAgent.instance();
}

export function resetPwaPerformanceAgentForTests(): void {
  inst = null;
}
