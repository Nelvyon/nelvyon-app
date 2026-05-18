import type { ILlmClient } from "../../LlmClient";
import type { PwaInput, PwaOutput } from "./shared";
import { getDefaultPwaLlm, runPwaAgentCore } from "./shared";

const AGENT_ID = "pwa-sincronizacion";

let inst: PwaSincronizacionAgent | null = null;

export class PwaSincronizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PwaSincronizacionAgent {
    if (!inst) inst = new PwaSincronizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPwaLlm();
  }

  async execute(input: PwaInput): Promise<PwaOutput> {
    return runPwaAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getPwaSincronizacionAgent(): PwaSincronizacionAgent {
  return PwaSincronizacionAgent.instance();
}

export function resetPwaSincronizacionAgentForTests(): void {
  inst = null;
}
