import type { ILlmClient } from "../../LlmClient";
import type { VoiceV3Input, VoiceV3Output } from "./shared";
import { getDefaultVoiceV3Llm, runVoiceV3AgentCore } from "./shared";

const AGENT_ID = "voicev3-propuesta";

let inst: VoiceV3PropuestaAgent | null = null;

export class VoiceV3PropuestaAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV3PropuestaAgent {
    if (!inst) inst = new VoiceV3PropuestaAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV3Llm();
  }

  async run(input: VoiceV3Input): Promise<VoiceV3Output> {
    const eliteRole = "Eres **Voice v3 Propuesta** — oferta en vivo.";
    const mission =
      "Diseña **generación de propuesta comercial durante la llamada** (módulos, pricing dinámico, exclusiones claras).";
    const fewShot =
      '{"result":"Plantilla propuesta voz→PDF","score":86,"recommendations":["Bloques modulares","Disclaimer legal oral","Versión enviada por email"]}';
    return runVoiceV3AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV3PropuestaAgent(): VoiceV3PropuestaAgent {
  return VoiceV3PropuestaAgent.instance();
}

export function resetVoiceV3PropuestaAgentForTests(): void {
  inst = null;
}
