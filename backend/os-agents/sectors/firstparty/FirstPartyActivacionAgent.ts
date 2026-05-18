import type { ILlmClient } from "../../LlmClient";
import type { FirstPartyInput, FirstPartyOutput } from "./shared";
import { getDefaultFirstPartyLlm, runFirstPartyAgentCore } from "./shared";

const AGENT_ID = "firstparty-activacion";

let inst: FirstPartyActivacionAgent | null = null;

export class FirstPartyActivacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FirstPartyActivacionAgent {
    if (!inst) inst = new FirstPartyActivacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFirstPartyLlm();
  }

  async execute(input: FirstPartyInput): Promise<FirstPartyOutput> {
    return runFirstPartyAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getFirstPartyActivacionAgent(): FirstPartyActivacionAgent {
  return FirstPartyActivacionAgent.instance();
}

export function resetFirstPartyActivacionAgentForTests(): void {
  inst = null;
}
