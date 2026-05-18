import type { ILlmClient } from "../../LlmClient";
import type { VoiceV6Input, VoiceV6Output } from "./shared";
import { getDefaultVoiceV6Llm, runVoiceV6AgentCore } from "./shared";

const AGENT_ID = "voicev6-balanceo";

let inst: VoiceV6BalanceoAgent | null = null;

export class VoiceV6BalanceoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV6BalanceoAgent {
    if (!inst) inst = new VoiceV6BalanceoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV6Llm();
  }

  async run(input: VoiceV6Input): Promise<VoiceV6Output> {
    const eliteRole = "Eres **Voice v6 Balanceo** — carga dinámica.";
    const mission =
      "Define **balanceo de carga dinámico** entre pools media/NLU (least pending, latencia EWMA, sticky por call-id).";
    const fewShot =
      '{"result":"LB voz multi-pool","score":88,"recommendations":["Health sub-segundo","Drain antes de upgrade","Anti thundering herd"]}';
    return runVoiceV6AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV6BalanceoAgent(): VoiceV6BalanceoAgent {
  return VoiceV6BalanceoAgent.instance();
}

export function resetVoiceV6BalanceoAgentForTests(): void {
  inst = null;
}
