import type { ILlmClient } from "../../LlmClient";
import type { OutboundB2BInput, OutboundB2BOutput } from "./shared";
import { getDefaultOutboundB2BLlm, runOutboundB2BAgentCore } from "./shared";

const AGENT_ID = "outboundb2b-analytics";

export class OutboundB2BAnalyticsAgent {
  private static inst: OutboundB2BAnalyticsAgent | undefined;

  static get instance(): OutboundB2BAnalyticsAgent {
    if (!OutboundB2BAnalyticsAgent.inst) OutboundB2BAnalyticsAgent.inst = new OutboundB2BAnalyticsAgent();
    return OutboundB2BAnalyticsAgent.inst;
  }

  static reset(): void {
    OutboundB2BAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOutboundB2BLlm();
  }

  async run(input: OutboundB2BInput): Promise<OutboundB2BOutput> {
    const eliteRole =
      "Eres **OutboundB2B Analytics Lead** — embudo outbound y unit economics.";
    const mission =
      "Reporta métricas: **reply rate**, **meeting rate**, **pipeline generado** y **CAC**; benchmarks >12% reply y >3% meetings.";
    const fewShot =
      '{"content":"Analytics: 14% reply, 3.5% meetings, pipeline €120k, CAC €180","score":90,"highlights":[">12% reply",">3% meetings"],"metrics":["Pipeline €"]}';
    return runOutboundB2BAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getOutboundB2BAnalyticsAgent(): OutboundB2BAnalyticsAgent {
  return OutboundB2BAnalyticsAgent.instance;
}

export function resetOutboundB2BAnalyticsAgentForTests(): void {
  OutboundB2BAnalyticsAgent.reset();
}
