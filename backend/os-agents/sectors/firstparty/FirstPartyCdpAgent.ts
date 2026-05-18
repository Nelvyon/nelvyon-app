import type { ILlmClient } from "../../LlmClient";
import type { FirstPartyInput, FirstPartyOutput } from "./shared";
import { getDefaultFirstPartyLlm, runFirstPartyAgentCore } from "./shared";

const AGENT_ID = "firstparty-cdp";

let inst: FirstPartyCdpAgent | null = null;

export class FirstPartyCdpAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FirstPartyCdpAgent {
    if (!inst) inst = new FirstPartyCdpAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFirstPartyLlm();
  }

  async execute(input: FirstPartyInput): Promise<FirstPartyOutput> {
    return runFirstPartyAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getFirstPartyCdpAgent(): FirstPartyCdpAgent {
  return FirstPartyCdpAgent.instance();
}

export function resetFirstPartyCdpAgentForTests(): void {
  inst = null;
}
