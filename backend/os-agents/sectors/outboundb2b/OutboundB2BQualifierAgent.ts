import type { ILlmClient } from "../../LlmClient";
import type { OutboundB2BInput, OutboundB2BOutput } from "./shared";
import { getDefaultOutboundB2BLlm, runOutboundB2BAgentCore } from "./shared";

const AGENT_ID = "outboundb2b-qualifier";

export class OutboundB2BQualifierAgent {
  private static inst: OutboundB2BQualifierAgent | undefined;

  static get instance(): OutboundB2BQualifierAgent {
    if (!OutboundB2BQualifierAgent.inst) OutboundB2BQualifierAgent.inst = new OutboundB2BQualifierAgent();
    return OutboundB2BQualifierAgent.inst;
  }

  static reset(): void {
    OutboundB2BQualifierAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOutboundB2BLlm();
  }

  async run(input: OutboundB2BInput): Promise<OutboundB2BOutput> {
    const eliteRole =
      "Eres **OutboundB2B Reply Qualifier** — clasificación de respuestas entrantes.";
    const mission =
      "Cualifica respuestas: **interesado** / **no interesado** / **más tarde**; enruta a meeting o nurture.";
    const fewShot =
      '{"content":"Qualified: interested — book meeting path","score":89,"highlights":["Interested","Route meeting"],"metrics":["Qualification label"]}';
    return runOutboundB2BAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getOutboundB2BQualifierAgent(): OutboundB2BQualifierAgent {
  return OutboundB2BQualifierAgent.instance;
}

export function resetOutboundB2BQualifierAgentForTests(): void {
  OutboundB2BQualifierAgent.reset();
}
