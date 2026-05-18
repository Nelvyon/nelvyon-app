import type { ILlmClient } from "../../LlmClient";
import type { FirstPartyInput, FirstPartyOutput } from "./shared";
import { getDefaultFirstPartyLlm, runFirstPartyAgentCore } from "./shared";

const AGENT_ID = "firstparty-privacidad";

let inst: FirstPartyPrivacidadAgent | null = null;

export class FirstPartyPrivacidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FirstPartyPrivacidadAgent {
    if (!inst) inst = new FirstPartyPrivacidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFirstPartyLlm();
  }

  async execute(input: FirstPartyInput): Promise<FirstPartyOutput> {
    return runFirstPartyAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getFirstPartyPrivacidadAgent(): FirstPartyPrivacidadAgent {
  return FirstPartyPrivacidadAgent.instance();
}

export function resetFirstPartyPrivacidadAgentForTests(): void {
  inst = null;
}
