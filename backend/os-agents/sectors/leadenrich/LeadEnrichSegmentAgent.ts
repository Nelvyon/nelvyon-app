import type { ILlmClient } from "../../LlmClient";
import type { LeadEnrichInput, LeadEnrichOutput } from "./shared";
import { getDefaultLeadEnrichLlm, runLeadEnrichAgentCore } from "./shared";

const AGENT_ID = "leadenrich-segment";

export class LeadEnrichSegmentAgent {
  private static inst: LeadEnrichSegmentAgent | undefined;

  static get instance(): LeadEnrichSegmentAgent {
    if (!LeadEnrichSegmentAgent.inst) LeadEnrichSegmentAgent.inst = new LeadEnrichSegmentAgent();
    return LeadEnrichSegmentAgent.inst;
  }

  static reset(): void {
    LeadEnrichSegmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLeadEnrichLlm();
  }

  async run(input: LeadEnrichInput): Promise<LeadEnrichOutput> {
    const eliteRole =
      "Eres **LeadEnrich Segment Router** — ICP, MQL, SQL, no-fit en <5s.";
    const mission =
      "Segmenta automáticamente: **ICP**, **MQL** (50-75), **SQL** (>75), **no-fit** (<30) según score y firmografía NELVYON.";
    const fewShot =
      '{"content":"Segment SQL: score 81, ICP match servicios 120 FTE","score":81,"highlights":["SQL","ICP match"],"metrics":["Segment label"]}';
    return runLeadEnrichAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getLeadEnrichSegmentAgent(): LeadEnrichSegmentAgent {
  return LeadEnrichSegmentAgent.instance;
}

export function resetLeadEnrichSegmentAgentForTests(): void {
  LeadEnrichSegmentAgent.reset();
}
