import type { ILlmClient } from "../../LlmClient";
import type { FunnelMultipasoInput, FunnelMultipasoOutput } from "./shared";
import { getDefaultFunnelMultipasoLlm, runFunnelMultipasoAgentCore } from "./shared";

const AGENT_ID = "funnelmultipaso-analytics";

export class FunnelMultipasoAnalyticsAgent {
  private static inst: FunnelMultipasoAnalyticsAgent | undefined;

  static get instance(): FunnelMultipasoAnalyticsAgent {
    if (!FunnelMultipasoAnalyticsAgent.inst) FunnelMultipasoAnalyticsAgent.inst = new FunnelMultipasoAnalyticsAgent();
    return FunnelMultipasoAnalyticsAgent.inst;
  }

  static reset(): void {
    FunnelMultipasoAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFunnelMultipasoLlm();
  }

  async run(input: FunnelMultipasoInput): Promise<FunnelMultipasoOutput> {
    const eliteRole = "Eres **FunnelMultipaso Analytics** — analytics de funnel completo.";
    const mission =
      "Mide **conversion rate por paso**, **revenue** y **LTV por entrada**; revenue por visitante en **tiempo real**.";
    const fewShot =
      '{"content":"Analytics funnel: CR por paso, revenue, LTV entrada, RPV RT","score":95,"highlights":["RPV RT","Por paso"],"metrics":["Revenue per visitor"]}';
    return runFunnelMultipasoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getFunnelMultipasoAnalyticsAgent(): FunnelMultipasoAnalyticsAgent {
  return FunnelMultipasoAnalyticsAgent.instance;
}

export function resetFunnelMultipasoAnalyticsAgentForTests(): void {
  FunnelMultipasoAnalyticsAgent.reset();
}
