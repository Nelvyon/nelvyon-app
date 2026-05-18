import type { ILlmClient } from "../../LlmClient";
import type { FirstPartyInput, FirstPartyOutput } from "./shared";
import { getDefaultFirstPartyLlm, runFirstPartyAgentCore } from "./shared";

const AGENT_ID = "firstparty-prediccion";

let inst: FirstPartyPrediccionAgent | null = null;

export class FirstPartyPrediccionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FirstPartyPrediccionAgent {
    if (!inst) inst = new FirstPartyPrediccionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFirstPartyLlm();
  }

  async execute(input: FirstPartyInput): Promise<FirstPartyOutput> {
    return runFirstPartyAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getFirstPartyPrediccionAgent(): FirstPartyPrediccionAgent {
  return FirstPartyPrediccionAgent.instance();
}

export function resetFirstPartyPrediccionAgentForTests(): void {
  inst = null;
}
