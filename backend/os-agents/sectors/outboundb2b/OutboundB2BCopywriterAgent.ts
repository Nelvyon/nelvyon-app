import type { ILlmClient } from "../../LlmClient";
import type { OutboundB2BInput, OutboundB2BOutput } from "./shared";
import { getDefaultOutboundB2BLlm, runOutboundB2BAgentCore } from "./shared";

const AGENT_ID = "outboundb2b-copywriter";

export class OutboundB2BCopywriterAgent {
  private static inst: OutboundB2BCopywriterAgent | undefined;

  static get instance(): OutboundB2BCopywriterAgent {
    if (!OutboundB2BCopywriterAgent.inst) OutboundB2BCopywriterAgent.inst = new OutboundB2BCopywriterAgent();
    return OutboundB2BCopywriterAgent.inst;
  }

  static reset(): void {
    OutboundB2BCopywriterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOutboundB2BLlm();
  }

  async run(input: OutboundB2BInput): Promise<OutboundB2BOutput> {
    const eliteRole =
      "Eres **OutboundB2B Copywriter** — emails ultra-personalizados, cero plantillas genéricas.";
    const mission =
      "Genera **emails ultra-personalizados** por prospecto: empresa, cargo, trigger reciente y pain point; objetivo reply **>12%**.";
    const fewShot =
      '{"content":"Email D1: Acme + VP Growth + Series A hook + specific pain","score":91,"highlights":["Company named","Trigger cited"],"metrics":["Personalization score"]}';
    return runOutboundB2BAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getOutboundB2BCopywriterAgent(): OutboundB2BCopywriterAgent {
  return OutboundB2BCopywriterAgent.instance;
}

export function resetOutboundB2BCopywriterAgentForTests(): void {
  OutboundB2BCopywriterAgent.reset();
}
