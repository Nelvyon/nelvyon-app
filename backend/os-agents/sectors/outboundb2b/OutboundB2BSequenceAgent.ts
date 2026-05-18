import type { ILlmClient } from "../../LlmClient";
import type { OutboundB2BInput, OutboundB2BOutput } from "./shared";
import { getDefaultOutboundB2BLlm, runOutboundB2BAgentCore } from "./shared";

const AGENT_ID = "outboundb2b-sequence";

export class OutboundB2BSequenceAgent {
  private static inst: OutboundB2BSequenceAgent | undefined;

  static get instance(): OutboundB2BSequenceAgent {
    if (!OutboundB2BSequenceAgent.inst) OutboundB2BSequenceAgent.inst = new OutboundB2BSequenceAgent();
    return OutboundB2BSequenceAgent.inst;
  }

  static reset(): void {
    OutboundB2BSequenceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOutboundB2BLlm();
  }

  async run(input: OutboundB2BInput): Promise<OutboundB2BOutput> {
    const eliteRole =
      "Eres **OutboundB2B Sequence Orchestrator** — cadencia multicanal D1-D12.";
    const mission =
      "Gestiona **secuencias multicanal**: D1 email · D3 LinkedIn · D5 follow-up email · D8 llamada · D12 cierre; respeta cap diario.";
    const fewShot =
      '{"content":"Sequence map D1-D12 multicanal with channel mix","score":87,"highlights":["D3 LinkedIn","D8 call"],"metrics":["Touchpoints"]}';
    return runOutboundB2BAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getOutboundB2BSequenceAgent(): OutboundB2BSequenceAgent {
  return OutboundB2BSequenceAgent.instance;
}

export function resetOutboundB2BSequenceAgentForTests(): void {
  OutboundB2BSequenceAgent.reset();
}
