import type { ILlmClient } from "../../LlmClient";
import type { RevenueIntelligenceInput, RevenueIntelligenceOutput } from "./shared";
import { getDefaultRevenueIntelligenceLlm, runRevenueIntelligenceAgentCore } from "./shared";

const AGENT_ID = "revenueintelligence-talkratio";

export class TalkRatioAgent {
  private static inst: TalkRatioAgent | undefined;

  static get instance(): TalkRatioAgent {
    if (!TalkRatioAgent.inst) TalkRatioAgent.inst = new TalkRatioAgent();
    return TalkRatioAgent.inst;
  }

  static reset(): void {
    TalkRatioAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRevenueIntelligenceLlm();
  }

  async run(input: RevenueIntelligenceInput): Promise<RevenueIntelligenceOutput> {
    const eliteRole = "Eres **Talk Ratio** — ratio de habla vendedor/cliente.";
    const mission =
      "Analiza **ratio de habla vendedor/cliente**, **mejores prácticas** y **benchmarks** por segmento.";
    const fewShot =
      '{"content":"Talk ratio: vendedor/cliente, benchmarks, mejores prácticas","score":92,"highlights":["Ratio habla","Benchmarks"],"metrics":["Talk ratio"]}';
    return runRevenueIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getTalkRatioAgent(): TalkRatioAgent {
  return TalkRatioAgent.instance;
}

export function resetTalkRatioAgentForTests(): void {
  TalkRatioAgent.reset();
}
