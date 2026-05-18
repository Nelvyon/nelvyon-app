import type { ILlmClient } from "../../LlmClient";
import type { PwaInput, PwaOutput } from "./shared";
import { getDefaultPwaLlm, runPwaAgentCore } from "./shared";

const AGENT_ID = "pwa-notificaciones";

let inst: PwaNotificacionesAgent | null = null;

export class PwaNotificacionesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PwaNotificacionesAgent {
    if (!inst) inst = new PwaNotificacionesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPwaLlm();
  }

  async execute(input: PwaInput): Promise<PwaOutput> {
    return runPwaAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getPwaNotificacionesAgent(): PwaNotificacionesAgent {
  return PwaNotificacionesAgent.instance();
}

export function resetPwaNotificacionesAgentForTests(): void {
  inst = null;
}
