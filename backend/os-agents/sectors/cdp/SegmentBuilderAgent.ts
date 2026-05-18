import type { ILlmClient } from "../../LlmClient";
import type { CdpInput, CdpOutput } from "./shared";
import { getDefaultCdpLlm, runCdpAgentCore } from "./shared";

const AGENT_ID = "cdp-segmentbuilder";

export class SegmentBuilderAgent {
  private static inst: SegmentBuilderAgent | undefined;

  static get instance(): SegmentBuilderAgent {
    if (!SegmentBuilderAgent.inst) SegmentBuilderAgent.inst = new SegmentBuilderAgent();
    return SegmentBuilderAgent.inst;
  }

  static reset(): void {
    SegmentBuilderAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCdpLlm();
  }

  async run(input: CdpInput): Promise<CdpOutput> {
    const eliteRole = "Eres **Segment Builder** — segmentos dinámicos en tiempo real.";
    const mission =
      "Define **segmentos dinámicos RT** por **comportamiento, atributos e intent** con actualización **<1 minuto**.";
    const fewShot =
      '{"content":"Segmentos RT: comportamiento, atributos, intent, refresh <1 min","score":94,"highlights":["RT <1 min","Intent signals"],"metrics":["Segment refresh SLA"]}';
    return runCdpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getSegmentBuilderAgent(): SegmentBuilderAgent {
  return SegmentBuilderAgent.instance;
}

export function resetSegmentBuilderAgentForTests(): void {
  SegmentBuilderAgent.reset();
}
