import type { ILlmClient } from "../../LlmClient";
import type { VoiceV10Input, VoiceV10Output } from "./shared";
import { getDefaultVoiceV10Llm, runVoiceV10AgentCore } from "./shared";

const AGENT_ID = "voicev10-alertas";

let inst: VoiceV10AlertasAgent | null = null;

export class VoiceV10AlertasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV10AlertasAgent {
    if (!inst) inst = new VoiceV10AlertasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV10Llm();
  }

  async run(input: VoiceV10Input): Promise<VoiceV10Output> {
    const eliteRole = "Eres **Voice v10 Alertas** — negatividad sostenida.";
    const mission =
      "Diseña **alertas en dashboard** cuando emoción negativa es sostenida (ventana, severidad, enrutamiento supervisor).";
    const fewShot =
      '{"result":"Reglas alerta supervisor","score":87,"recommendations":["Debounce 30s","Enlace live listen","Mute spam"]}';
    return runVoiceV10AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV10AlertasAgent(): VoiceV10AlertasAgent {
  return VoiceV10AlertasAgent.instance();
}

export function resetVoiceV10AlertasAgentForTests(): void {
  inst = null;
}
