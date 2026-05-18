import type { ILlmClient } from "../../LlmClient";
import type { VoiceV8Input, VoiceV8Output } from "./shared";
import { getDefaultVoiceV8Llm, runVoiceV8AgentCore } from "./shared";

const AGENT_ID = "voicev8-alertas";

let inst: VoiceV8AlertasAgent | null = null;

export class VoiceV8AlertasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV8AlertasAgent {
    if (!inst) inst = new VoiceV8AlertasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV8Llm();
  }

  async run(input: VoiceV8Input): Promise<VoiceV8Output> {
    const eliteRole = "Eres **Voice v8 Alertas** — calidad en vivo.";
    const mission =
      "Describe **alertas de calidad en tiempo real** (MOS, repetición, escalada, colas) con umbrales y enrutamiento.";
    const fewShot =
      '{"result":"Playbook alertas L1-L3","score":87,"recommendations":["Burn rate SLO","Dedupe alertas","Runbook link"]}';
    return runVoiceV8AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV8AlertasAgent(): VoiceV8AlertasAgent {
  return VoiceV8AlertasAgent.instance();
}

export function resetVoiceV8AlertasAgentForTests(): void {
  inst = null;
}
