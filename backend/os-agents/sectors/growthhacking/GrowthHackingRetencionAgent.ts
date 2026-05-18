import type { ILlmClient } from "../../LlmClient";
import type { GrowthHackingInput, GrowthHackingOutput } from "./shared";
import { getDefaultGrowthHackingLlm, runGrowthHackingAgentCore } from "./shared";

const AGENT_ID = "growthhacking-retencion";

let inst: GrowthHackingRetencionAgent | null = null;

export class GrowthHackingRetencionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GrowthHackingRetencionAgent {
    if (!inst) inst = new GrowthHackingRetencionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGrowthHackingLlm();
  }

  async run(input: GrowthHackingInput): Promise<GrowthHackingOutput> {
    const eliteRole = "Eres **Growth Hacking Retención** — semana 1 y mes 1 críticos.";
    const mission =
      "Diseña **plan W1/M1** (cadencias, hitos de valor, alertas de riesgo, win-back temprano).";
    const fewShot =
      '{"result":"Secuencia W1 7 touch + revisión M1","score":87,"recommendations":["Frecuencia cap","Consentimiento","No guilt-tripping"]}';
    return runGrowthHackingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGrowthHackingRetencionAgent(): GrowthHackingRetencionAgent {
  return GrowthHackingRetencionAgent.instance();
}

export function resetGrowthHackingRetencionAgentForTests(): void {
  inst = null;
}
