import type { ILlmClient } from "../../LlmClient";
import type { LeadEnrichInput, LeadEnrichOutput } from "./shared";
import { getDefaultLeadEnrichLlm, runLeadEnrichAgentCore } from "./shared";

const AGENT_ID = "leadenrich-score";

export class LeadEnrichScoreAgent {
  private static inst: LeadEnrichScoreAgent | undefined;

  static get instance(): LeadEnrichScoreAgent {
    if (!LeadEnrichScoreAgent.inst) LeadEnrichScoreAgent.inst = new LeadEnrichScoreAgent();
    return LeadEnrichScoreAgent.inst;
  }

  static reset(): void {
    LeadEnrichScoreAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLeadEnrichLlm();
  }

  async run(input: LeadEnrichInput): Promise<LeadEnrichOutput> {
    const eliteRole =
      "Eres **LeadEnrich Scoring Engine** — Lead Score 0-100 en <5s.";
    const mission =
      "Calcula **Lead Score 0-100**: **Fit 40% + Intent 40% + Timing 20%**; umbrales SQL >75, MQL 50-75, no-fit <30.";
    const fewShot =
      '{"content":"Lead Score 78: fit ICP, intent alto, timing Q2","score":78,"highlights":["SQL threshold","Fit+Intent"],"metrics":["Lead Score"]}';
    return runLeadEnrichAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getLeadEnrichScoreAgent(): LeadEnrichScoreAgent {
  return LeadEnrichScoreAgent.instance;
}

export function resetLeadEnrichScoreAgentForTests(): void {
  LeadEnrichScoreAgent.reset();
}
