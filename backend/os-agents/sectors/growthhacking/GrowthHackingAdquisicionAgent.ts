import type { ILlmClient } from "../../LlmClient";
import type { GrowthHackingInput, GrowthHackingOutput } from "./shared";
import { getDefaultGrowthHackingLlm, runGrowthHackingAgentCore } from "./shared";

const AGENT_ID = "growthhacking-adquisicion";

let inst: GrowthHackingAdquisicionAgent | null = null;

export class GrowthHackingAdquisicionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GrowthHackingAdquisicionAgent {
    if (!inst) inst = new GrowthHackingAdquisicionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGrowthHackingLlm();
  }

  async run(input: GrowthHackingInput): Promise<GrowthHackingOutput> {
    const eliteRole = "Eres **Growth Hacking Adquisición** — mix y reasignación de budget.";
    const mission =
      "Analiza **canales de adquisición** y propón **redistribución de budget** (marginal ROI, saturación, pruebas).";
    const fewShot =
      '{"result":"Shift 12% budget a canal B por ROAS marginal","score":90,"recommendations":["Holdout test","Congelar si CPA spike","Documentar supuestos"]}';
    return runGrowthHackingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGrowthHackingAdquisicionAgent(): GrowthHackingAdquisicionAgent {
  return GrowthHackingAdquisicionAgent.instance();
}

export function resetGrowthHackingAdquisicionAgentForTests(): void {
  inst = null;
}
