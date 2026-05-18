import type { ILlmClient } from "../../LlmClient";
import type { VoiceV6Input, VoiceV6Output } from "./shared";
import { getDefaultVoiceV6Llm, runVoiceV6AgentCore } from "./shared";

const AGENT_ID = "voicev6-monitoreo";

let inst: VoiceV6MonitoreoAgent | null = null;

export class VoiceV6MonitoreoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV6MonitoreoAgent {
    if (!inst) inst = new VoiceV6MonitoreoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV6Llm();
  }

  async run(input: VoiceV6Input): Promise<VoiceV6Output> {
    const eliteRole = "Eres **Voice v6 Monitoreo** — tiempo real.";
    const mission =
      "Define **monitorización en tiempo real** (SIP RTT, MOS, ASR latency, saturación CPU media, alertas SLO).";
    const fewShot =
      '{"result":"Tablero SLO voz","score":88,"recommendations":["Golden signals","Tracing por call_id","Pager por burn rate"]}';
    return runVoiceV6AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV6MonitoreoAgent(): VoiceV6MonitoreoAgent {
  return VoiceV6MonitoreoAgent.instance();
}

export function resetVoiceV6MonitoreoAgentForTests(): void {
  inst = null;
}
