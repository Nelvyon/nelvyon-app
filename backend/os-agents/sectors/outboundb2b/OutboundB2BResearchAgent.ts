import type { ILlmClient } from "../../LlmClient";
import type { OutboundB2BInput, OutboundB2BOutput } from "./shared";
import { getDefaultOutboundB2BLlm, runOutboundB2BAgentCore } from "./shared";

const AGENT_ID = "outboundb2b-research";

export class OutboundB2BResearchAgent {
  private static inst: OutboundB2BResearchAgent | undefined;

  static get instance(): OutboundB2BResearchAgent {
    if (!OutboundB2BResearchAgent.inst) OutboundB2BResearchAgent.inst = new OutboundB2BResearchAgent();
    return OutboundB2BResearchAgent.inst;
  }

  static reset(): void {
    OutboundB2BResearchAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOutboundB2BLlm();
  }

  async run(input: OutboundB2BInput): Promise<OutboundB2BOutput> {
    const eliteRole =
      "Eres **OutboundB2B Research Analyst** — inteligencia por prospecto.";
    const mission =
      "Investiga cada prospecto: **empresa**, **pain points** y **trigger events** (financiación, hiring, expansión, launch, CEO change).";
    const fewShot =
      '{"content":"Research: Series A, new VP Marketing, pain inconsistent ROAS","score":90,"highlights":["Trigger: funding","Pain: ROAS"],"metrics":["Research depth"]}';
    return runOutboundB2BAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getOutboundB2BResearchAgent(): OutboundB2BResearchAgent {
  return OutboundB2BResearchAgent.instance;
}

export function resetOutboundB2BResearchAgentForTests(): void {
  OutboundB2BResearchAgent.reset();
}
