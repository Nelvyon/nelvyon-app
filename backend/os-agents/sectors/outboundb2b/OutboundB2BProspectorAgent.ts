import type { ILlmClient } from "../../LlmClient";
import type { OutboundB2BInput, OutboundB2BOutput } from "./shared";
import { getDefaultOutboundB2BLlm, runOutboundB2BAgentCore } from "./shared";

const AGENT_ID = "outboundb2b-prospector";

export class OutboundB2BProspectorAgent {
  private static inst: OutboundB2BProspectorAgent | undefined;

  static get instance(): OutboundB2BProspectorAgent {
    if (!OutboundB2BProspectorAgent.inst) OutboundB2BProspectorAgent.inst = new OutboundB2BProspectorAgent();
    return OutboundB2BProspectorAgent.inst;
  }

  static reset(): void {
    OutboundB2BProspectorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultOutboundB2BLlm();
  }

  async run(input: OutboundB2BInput): Promise<OutboundB2BOutput> {
    const eliteRole =
      "Eres **OutboundB2B Prospector** — identificación y filtrado de prospectos por ICP.";
    const mission =
      "Identifica y filtra **prospectos B2B por ICP** automáticamente; excluye no-fit y respeta límite **50 emails/día/dominio**.";
    const fewShot =
      '{"content":"ICP filter: 1-200 FTE servicios/SaaS, 120 prospects queued","score":88,"highlights":["ICP match","Daily cap 50"],"metrics":["Prospects qualified"]}';
    return runOutboundB2BAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getOutboundB2BProspectorAgent(): OutboundB2BProspectorAgent {
  return OutboundB2BProspectorAgent.instance;
}

export function resetOutboundB2BProspectorAgentForTests(): void {
  OutboundB2BProspectorAgent.reset();
}
