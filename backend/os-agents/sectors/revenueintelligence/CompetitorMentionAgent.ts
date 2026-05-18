import type { ILlmClient } from "../../LlmClient";
import type { RevenueIntelligenceInput, RevenueIntelligenceOutput } from "./shared";
import { getDefaultRevenueIntelligenceLlm, runRevenueIntelligenceAgentCore } from "./shared";

const AGENT_ID = "revenueintelligence-competitormention";

export class CompetitorMentionAgent {
  private static inst: CompetitorMentionAgent | undefined;

  static get instance(): CompetitorMentionAgent {
    if (!CompetitorMentionAgent.inst) CompetitorMentionAgent.inst = new CompetitorMentionAgent();
    return CompetitorMentionAgent.inst;
  }

  static reset(): void {
    CompetitorMentionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRevenueIntelligenceLlm();
  }

  async run(input: RevenueIntelligenceInput): Promise<RevenueIntelligenceOutput> {
    const eliteRole = "Eres **Competitor Mention** — detección de competidores en llamadas.";
    const mission =
      "Detecta **menciones de competidores** en llamadas y genera **battlecards automáticas** en tiempo real.";
    const fewShot =
      '{"content":"Competitor mentions: detección RT, battlecards auto","score":93,"highlights":["Mentions RT","Battlecards"],"metrics":["Competitor mention rate"]}';
    return runRevenueIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getCompetitorMentionAgent(): CompetitorMentionAgent {
  return CompetitorMentionAgent.instance;
}

export function resetCompetitorMentionAgentForTests(): void {
  CompetitorMentionAgent.reset();
}
