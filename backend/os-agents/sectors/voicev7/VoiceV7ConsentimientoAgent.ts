import type { ILlmClient } from "../../LlmClient";
import type { VoiceV7Input, VoiceV7Output } from "./shared";
import { getDefaultVoiceV7Llm, runVoiceV7AgentCore } from "./shared";

const AGENT_ID = "voicev7-consentimiento";

let inst: VoiceV7ConsentimientoAgent | null = null;

export class VoiceV7ConsentimientoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV7ConsentimientoAgent {
    if (!inst) inst = new VoiceV7ConsentimientoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV7Llm();
  }

  async run(input: VoiceV7Input): Promise<VoiceV7Output> {
    const eliteRole = "Eres **Voice v7 Consentimiento** — inicio de llamada.";
    const mission =
      "Define **notificación de consentimiento al inicio** (scripts multilenguaje, DTMF/Sí-No, alternativa sin grabación).";
    const fewShot =
      '{"result":"Script apertura 15s","score":89,"recommendations":["Re-prompt si ambiguo","Log outcome","Ruta sin grabar"]}';
    return runVoiceV7AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV7ConsentimientoAgent(): VoiceV7ConsentimientoAgent {
  return VoiceV7ConsentimientoAgent.instance();
}

export function resetVoiceV7ConsentimientoAgentForTests(): void {
  inst = null;
}
