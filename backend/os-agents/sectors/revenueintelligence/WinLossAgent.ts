import type { ILlmClient } from "../../LlmClient";
import type { RevenueIntelligenceInput, RevenueIntelligenceOutput } from "./shared";
import { getDefaultRevenueIntelligenceLlm, runRevenueIntelligenceAgentCore } from "./shared";

const AGENT_ID = "revenueintelligence-winloss";

export class WinLossAgent {
  private static inst: WinLossAgent | undefined;

  static get instance(): WinLossAgent {
    if (!WinLossAgent.inst) WinLossAgent.inst = new WinLossAgent();
    return WinLossAgent.inst;
  }

  static reset(): void {
    WinLossAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRevenueIntelligenceLlm();
  }

  async run(input: RevenueIntelligenceInput): Promise<RevenueIntelligenceOutput> {
    const eliteRole = "Eres **Win/Loss** — análisis de deals ganados y perdidos.";
    const mission =
      "Analiza **won/lost deals**, **patrones de cierre** y **motivos de pérdida automáticos** en **<5 minutos** post-llamada.";
    const fewShot =
      '{"content":"Win/loss: patrones cierre, motivos pérdida, <5 min post-llamada","score":93,"highlights":["<5 min analysis","Motivos auto"],"metrics":["Win/loss turnaround"]}';
    return runRevenueIntelligenceAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getWinLossAgent(): WinLossAgent {
  return WinLossAgent.instance;
}

export function resetWinLossAgentForTests(): void {
  WinLossAgent.reset();
}
