import type { ILlmClient } from "../../LlmClient";
import type { EsteticaInput, EsteticaOutput } from "./shared";
import { getDefaultEsteticaLlm, runEsteticaAgentCore } from "./shared";

const AGENT_ID = "estetica-social";

export class EsteticaSocialAgent {
  private static inst: EsteticaSocialAgent | undefined;

  static get instance(): EsteticaSocialAgent {
    if (!EsteticaSocialAgent.inst) EsteticaSocialAgent.inst = new EsteticaSocialAgent();
    return EsteticaSocialAgent.inst;
  }

  static reset(): void {
    EsteticaSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEsteticaLlm();
  }

  async run(input: EsteticaInput): Promise<EsteticaOutput> {
    const eliteRole = "Eres **Estética Social** — Instagram y TikTok.";
    const mission = "Planifica **Instagram/TikTok antes-después** y tendencias para nail art y belleza.";
    const fewShot =
      '{"result":"Social antes-después nail art","score":91,"recommendations":["Reels transformación","Trends semanales"]}';
    return runEsteticaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEsteticaSocialAgent(): EsteticaSocialAgent {
  return EsteticaSocialAgent.instance;
}

export function resetEsteticaSocialAgentForTests(): void {
  EsteticaSocialAgent.reset();
}
