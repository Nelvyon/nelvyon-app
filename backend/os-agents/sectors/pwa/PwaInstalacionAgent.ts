import type { ILlmClient } from "../../LlmClient";
import type { PwaInput, PwaOutput } from "./shared";
import { getDefaultPwaLlm, runPwaAgentCore } from "./shared";

const AGENT_ID = "pwa-instalacion";

let inst: PwaInstalacionAgent | null = null;

export class PwaInstalacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PwaInstalacionAgent {
    if (!inst) inst = new PwaInstalacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPwaLlm();
  }

  async execute(input: PwaInput): Promise<PwaOutput> {
    return runPwaAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getPwaInstalacionAgent(): PwaInstalacionAgent {
  return PwaInstalacionAgent.instance();
}

export function resetPwaInstalacionAgentForTests(): void {
  inst = null;
}
