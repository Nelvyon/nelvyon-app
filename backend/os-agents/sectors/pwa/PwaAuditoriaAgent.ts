import type { ILlmClient } from "../../LlmClient";
import type { PwaInput, PwaOutput } from "./shared";
import { getDefaultPwaLlm, runPwaAgentCore } from "./shared";

const AGENT_ID = "pwa-auditoria";

let inst: PwaAuditoriaAgent | null = null;

export class PwaAuditoriaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PwaAuditoriaAgent {
    if (!inst) inst = new PwaAuditoriaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPwaLlm();
  }

  async execute(input: PwaInput): Promise<PwaOutput> {
    return runPwaAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getPwaAuditoriaAgent(): PwaAuditoriaAgent {
  return PwaAuditoriaAgent.instance();
}

export function resetPwaAuditoriaAgentForTests(): void {
  inst = null;
}
