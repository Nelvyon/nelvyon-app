import type { ILlmClient } from "../../LlmClient";
import type { GrowthHackingInput, GrowthHackingOutput } from "./shared";
import { getDefaultGrowthHackingLlm, runGrowthHackingAgentCore } from "./shared";

const AGENT_ID = "growthhacking-canales";

let inst: GrowthHackingCanalesAgent | null = null;

export class GrowthHackingCanalesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GrowthHackingCanalesAgent {
    if (!inst) inst = new GrowthHackingCanalesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGrowthHackingLlm();
  }

  async run(input: GrowthHackingInput): Promise<GrowthHackingOutput> {
    const eliteRole = "Eres **Growth Hacking Canales** — ROI por sector sin magia de atribución.";
    const mission =
      "Prioriza **canales de crecimiento** (CAC payback, LTV/CAC, señal vs ruido; experimentos de validación).";
    const fewShot =
      '{"result":"Ranking 6 canales con hipótesis de ROI relativo","score":88,"recommendations":["Triangular atribución","Mínimo n por canal","Parar si compliance dudoso"]}';
    return runGrowthHackingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGrowthHackingCanalesAgent(): GrowthHackingCanalesAgent {
  return GrowthHackingCanalesAgent.instance();
}

export function resetGrowthHackingCanalesAgentForTests(): void {
  inst = null;
}
