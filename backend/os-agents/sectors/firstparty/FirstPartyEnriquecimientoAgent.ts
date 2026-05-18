import type { ILlmClient } from "../../LlmClient";
import type { FirstPartyInput, FirstPartyOutput } from "./shared";
import { getDefaultFirstPartyLlm, runFirstPartyAgentCore } from "./shared";

const AGENT_ID = "firstparty-enriquecimiento";

let inst: FirstPartyEnriquecimientoAgent | null = null;

export class FirstPartyEnriquecimientoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): FirstPartyEnriquecimientoAgent {
    if (!inst) inst = new FirstPartyEnriquecimientoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFirstPartyLlm();
  }

  async execute(input: FirstPartyInput): Promise<FirstPartyOutput> {
    return runFirstPartyAgentCore(AGENT_ID, { ...input, agentId: AGENT_ID }, this.llm);
  }
}

export function getFirstPartyEnriquecimientoAgent(): FirstPartyEnriquecimientoAgent {
  return FirstPartyEnriquecimientoAgent.instance();
}

export function resetFirstPartyEnriquecimientoAgentForTests(): void {
  inst = null;
}
