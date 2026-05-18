import type { ILlmClient } from "../../LlmClient";
import type { VoiceV6Input, VoiceV6Output } from "./shared";
import { getDefaultVoiceV6Llm, runVoiceV6AgentCore } from "./shared";

const AGENT_ID = "voicev6-colas";

let inst: VoiceV6ColasAgent | null = null;

export class VoiceV6ColasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV6ColasAgent {
    if (!inst) inst = new VoiceV6ColasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV6Llm();
  }

  async run(input: VoiceV6Input): Promise<VoiceV6Output> {
    const eliteRole = "Eres **Voice v6 Colas** — prioridad por plan.";
    const mission =
      "Diseña **colas prioritarias por cliente/plan** (WFQ, aging, reserva de capacidad premium).";
    const fewShot =
      '{"result":"Política cola multi-tier","score":87,"recommendations":["Cuota reservada enterprise","Starvation guard","SLA visible"]}';
    return runVoiceV6AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV6ColasAgent(): VoiceV6ColasAgent {
  return VoiceV6ColasAgent.instance();
}

export function resetVoiceV6ColasAgentForTests(): void {
  inst = null;
}
