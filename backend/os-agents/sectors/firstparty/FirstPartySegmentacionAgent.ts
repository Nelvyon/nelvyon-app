import type { ILlmClient } from "../../LlmClient";
import type { FirstPartyInput, FirstPartyOutput } from "./shared";
import { getDefaultFirstPartyLlm, runFirstPartyAgentCore } from "./shared";

const AGENT_ID = "firstparty-segmentacion";

let inst: FirstPartySegmentacionAgent | null = null;

export class FirstPartySegmentacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FirstPartySegmentacionAgent {
    if (!inst) inst = new FirstPartySegmentacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFirstPartyLlm();
  }

  async execute(input: FirstPartyInput): Promise<FirstPartyOutput> {
    return runFirstPartyAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getFirstPartySegmentacionAgent(): FirstPartySegmentacionAgent {
  return FirstPartySegmentacionAgent.instance();
}

export function resetFirstPartySegmentacionAgentForTests(): void {
  inst = null;
}
