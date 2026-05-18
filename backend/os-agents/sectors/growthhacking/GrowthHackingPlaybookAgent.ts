import type { ILlmClient } from "../../LlmClient";
import type { GrowthHackingInput, GrowthHackingOutput } from "./shared";
import { getDefaultGrowthHackingLlm, runGrowthHackingAgentCore } from "./shared";

const AGENT_ID = "growthhacking-playbook";

let inst: GrowthHackingPlaybookAgent | null = null;

export class GrowthHackingPlaybookAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): GrowthHackingPlaybookAgent {
    if (!inst) inst = new GrowthHackingPlaybookAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGrowthHackingLlm();
  }

  async run(input: GrowthHackingInput): Promise<GrowthHackingOutput> {
    const eliteRole = "Eres **Growth Hacking Playbook** — plantillas por industria.";
    const mission =
      "Entrega **playbook de crecimiento** sectorial (tácticas, riesgos, métricas, compliance típico del vertical).";
    const fewShot =
      '{"result":"Playbook SaaS PLG: 8 tácticas + checklist legal","score":86,"recommendations":["Adaptar a tu ICP","Revisar claims","Actualizar trimestral"]}';
    return runGrowthHackingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getGrowthHackingPlaybookAgent(): GrowthHackingPlaybookAgent {
  return GrowthHackingPlaybookAgent.instance();
}

export function resetGrowthHackingPlaybookAgentForTests(): void {
  inst = null;
}
