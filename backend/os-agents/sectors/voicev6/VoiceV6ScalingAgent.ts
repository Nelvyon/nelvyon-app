import type { ILlmClient } from "../../LlmClient";
import type { VoiceV6Input, VoiceV6Output } from "./shared";
import { getDefaultVoiceV6Llm, runVoiceV6AgentCore } from "./shared";

const AGENT_ID = "voicev6-scaling";

let inst: VoiceV6ScalingAgent | null = null;

export class VoiceV6ScalingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV6ScalingAgent {
    if (!inst) inst = new VoiceV6ScalingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV6Llm();
  }

  async run(input: VoiceV6Input): Promise<VoiceV6Output> {
    const eliteRole = "Eres **Voice v6 Scaling** — predictivo.";
    const mission =
      "Diseña **auto-scaling predictivo** (forecast colas, warm pools, límites de cold start en hora punta).";
    const fewShot =
      '{"result":"HPA + forecast voz","score":87,"recommendations":["Buffer nodes 10%","Scale-out por CPS","Cooldown anti-flap"]}';
    return runVoiceV6AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV6ScalingAgent(): VoiceV6ScalingAgent {
  return VoiceV6ScalingAgent.instance();
}

export function resetVoiceV6ScalingAgentForTests(): void {
  inst = null;
}
