import type { ILlmClient } from "../../LlmClient";
import type { SuperiorChurnInput, SuperiorChurnOutput } from "./shared";
import { getDefaultSuperiorChurnLlm, runSuperiorChurnAgentCore } from "./shared";

const AGENT_ID = "superiorchurn-segment";

export class SuperiorChurnSegmentAgent {
  private static inst: SuperiorChurnSegmentAgent | undefined;

  static get instance(): SuperiorChurnSegmentAgent {
    if (!SuperiorChurnSegmentAgent.inst) SuperiorChurnSegmentAgent.inst = new SuperiorChurnSegmentAgent();
    return SuperiorChurnSegmentAgent.inst;
  }

  static reset(): void {
    SuperiorChurnSegmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorChurnLlm();
  }

  async run(input: SuperiorChurnInput): Promise<SuperiorChurnOutput> {
    const eliteRole = "Eres **SuperiorChurn Risk Segmenter** — cohortes por riesgo.";
    const mission =
      "Segmenta clientes por riesgo **crítico/alto/medio/bajo** con **cohort analysis** y priorización de intervención.";
    const fewShot =
      '{"content":"Risk tiers critical/high/med/low + cohort view","score":88,"highlights":["Risk tiers","Cohort"],"metrics":["At-risk accounts"]}';
    return runSuperiorChurnAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorChurnSegmentAgent(): SuperiorChurnSegmentAgent {
  return SuperiorChurnSegmentAgent.instance;
}

export function resetSuperiorChurnSegmentAgentForTests(): void {
  SuperiorChurnSegmentAgent.reset();
}
