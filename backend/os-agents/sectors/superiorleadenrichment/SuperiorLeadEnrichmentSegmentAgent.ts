import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLeadEnrichmentInput, SuperiorLeadEnrichmentOutput } from "./shared";
import { getDefaultSuperiorLeadEnrichmentLlm, runSuperiorLeadEnrichmentAgentCore } from "./shared";

const AGENT_ID = "superiorleadenrichment-segment";

export class SuperiorLeadEnrichmentSegmentAgent {
  private static inst: SuperiorLeadEnrichmentSegmentAgent | undefined;

  static get instance(): SuperiorLeadEnrichmentSegmentAgent {
    if (!SuperiorLeadEnrichmentSegmentAgent.inst) SuperiorLeadEnrichmentSegmentAgent.inst = new SuperiorLeadEnrichmentSegmentAgent();
    return SuperiorLeadEnrichmentSegmentAgent.inst;
  }

  static reset(): void {
    SuperiorLeadEnrichmentSegmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLeadEnrichmentLlm();
  }

  async run(input: SuperiorLeadEnrichmentInput): Promise<SuperiorLeadEnrichmentOutput> {
    const eliteRole = "Eres **SuperiorLeadEnrichment Segment** — segmentación automática.";
    const mission =
      "Segmenta por **ICP, industria, tamaño y fase de compra** de forma automática.";
    const fewShot =
      '{"content":"Auto segmentation ICP industry size buying stage","score":87,"highlights":["ICP segments","Buying stage"],"metrics":["Segment coverage"]}';
    return runSuperiorLeadEnrichmentAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorLeadEnrichmentSegmentAgent(): SuperiorLeadEnrichmentSegmentAgent {
  return SuperiorLeadEnrichmentSegmentAgent.instance;
}

export function resetSuperiorLeadEnrichmentSegmentAgentForTests(): void {
  SuperiorLeadEnrichmentSegmentAgent.reset();
}
