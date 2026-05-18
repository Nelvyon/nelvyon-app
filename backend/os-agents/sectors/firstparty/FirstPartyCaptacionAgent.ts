import type { ILlmClient } from "../../LlmClient";
import type { FirstPartyInput, FirstPartyOutput } from "./shared";
import { getDefaultFirstPartyLlm, runFirstPartyAgentCore } from "./shared";

const AGENT_ID = "firstparty-captacion";

let inst: FirstPartyCaptacionAgent | null = null;

export class FirstPartyCaptacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FirstPartyCaptacionAgent {
    if (!inst) inst = new FirstPartyCaptacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFirstPartyLlm();
  }

  async execute(input: FirstPartyInput): Promise<FirstPartyOutput> {
    return runFirstPartyAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getFirstPartyCaptacionAgent(): FirstPartyCaptacionAgent {
  return FirstPartyCaptacionAgent.instance();
}

export function resetFirstPartyCaptacionAgentForTests(): void {
  inst = null;
}
