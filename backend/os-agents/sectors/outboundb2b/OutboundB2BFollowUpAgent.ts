import type { ILlmClient } from "../../LlmClient";
import type { OutboundB2BInput, OutboundB2BOutput } from "./shared";
import { getDefaultOutboundB2BLlm, runOutboundB2BAgentCore } from "./shared";

const AGENT_ID = "outboundb2b-followup";

export class OutboundB2BFollowUpAgent {
  private static inst: OutboundB2BFollowUpAgent | undefined;

  static get instance(): OutboundB2BFollowUpAgent {
    if (!OutboundB2BFollowUpAgent.inst) OutboundB2BFollowUpAgent.inst = new OutboundB2BFollowUpAgent();
    return OutboundB2BFollowUpAgent.inst;
  }

  static reset(): void {
    OutboundB2BFollowUpAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOutboundB2BLlm();
  }

  async run(input: OutboundB2BInput): Promise<OutboundB2BOutput> {
    const eliteRole =
      "Eres **OutboundB2B Follow-Up Specialist** — variación de mensaje en cada touch.";
    const mission =
      "Ejecuta **follow-ups automáticos** con **variación de mensaje** cada vez; D5 y D12 sin repetir ángulo ni subject.";
    const fewShot =
      '{"content":"Follow-up D5 new angle, D12 breakup email variant","score":86,"highlights":["Message variation","No duplicate hook"],"metrics":["Follow-up count"]}';
    return runOutboundB2BAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getOutboundB2BFollowUpAgent(): OutboundB2BFollowUpAgent {
  return OutboundB2BFollowUpAgent.instance;
}

export function resetOutboundB2BFollowUpAgentForTests(): void {
  OutboundB2BFollowUpAgent.reset();
}
