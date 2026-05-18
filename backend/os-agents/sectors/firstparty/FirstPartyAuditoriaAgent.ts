import type { ILlmClient } from "../../LlmClient";
import type { FirstPartyInput, FirstPartyOutput } from "./shared";
import { getDefaultFirstPartyLlm, runFirstPartyAgentCore } from "./shared";

const AGENT_ID = "firstparty-auditoria";

let inst: FirstPartyAuditoriaAgent | null = null;

export class FirstPartyAuditoriaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FirstPartyAuditoriaAgent {
    if (!inst) inst = new FirstPartyAuditoriaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFirstPartyLlm();
  }

  async execute(input: FirstPartyInput): Promise<FirstPartyOutput> {
    return runFirstPartyAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getFirstPartyAuditoriaAgent(): FirstPartyAuditoriaAgent {
  return FirstPartyAuditoriaAgent.instance();
}

export function resetFirstPartyAuditoriaAgentForTests(): void {
  inst = null;
}
