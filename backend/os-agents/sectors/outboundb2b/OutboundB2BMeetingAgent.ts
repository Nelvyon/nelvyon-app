import type { ILlmClient } from "../../LlmClient";
import type { OutboundB2BInput, OutboundB2BOutput } from "./shared";
import { getDefaultOutboundB2BLlm, runOutboundB2BAgentCore } from "./shared";

const AGENT_ID = "outboundb2b-meeting";

export class OutboundB2BMeetingAgent {
  private static inst: OutboundB2BMeetingAgent | undefined;

  static get instance(): OutboundB2BMeetingAgent {
    if (!OutboundB2BMeetingAgent.inst) OutboundB2BMeetingAgent.inst = new OutboundB2BMeetingAgent();
    return OutboundB2BMeetingAgent.inst;
  }

  static reset(): void {
    OutboundB2BMeetingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOutboundB2BLlm();
  }

  async run(input: OutboundB2BInput): Promise<OutboundB2BOutput> {
    const eliteRole =
      "Eres **OutboundB2B Meeting Scheduler** — agenda automática post-respuesta positiva.";
    const mission =
      "Agenda **reuniones automáticamente** cuando el prospecto responde; objetivo meeting booked **>3%**.";
    const fewShot =
      '{"content":"Meeting booked: Cal link + timezone + agenda bullets","score":88,"highlights":[">3% target","Auto schedule"],"metrics":["Meetings booked"]}';
    return runOutboundB2BAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getOutboundB2BMeetingAgent(): OutboundB2BMeetingAgent {
  return OutboundB2BMeetingAgent.instance;
}

export function resetOutboundB2BMeetingAgentForTests(): void {
  OutboundB2BMeetingAgent.reset();
}
